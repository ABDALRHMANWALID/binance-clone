import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { basename } from 'node:path';
import { MAX_UPLOAD_BYTES } from '../chat.constants.js';
import { SlidingWindowLimiter } from '../rate-limiter.js';
import { ChatMessageAttachment } from '../entities/chat-message-attachment.entity.js';
import { ChatUpload } from '../entities/chat-upload.entity.js';
import { ChatConversationsService } from './chat-conversations.service.js';
import { StorageService } from './storage.service.js';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const UPLOAD_TTL_MS = 60 * 60 * 1000; // an upload that is never attached is deleted after 1 hour
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * The real type comes from the first bytes of the file.
 * The extension and the mime type sent by the client are never trusted.
 */
function detectMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

function safeFilename(name: string) {
  const cleaned = basename(name || 'file')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 120);
  return cleaned || 'file';
}

@Injectable()
export class ChatAttachmentsService {
  private readonly logger = new Logger(ChatAttachmentsService.name);
  private readonly limiter = new SlidingWindowLimiter(10, 60_000); // 10 uploads per minute per user
  private readonly secret: string;
  private readonly publicApiUrl: string;

  constructor(
    config: ConfigService,
    private readonly conversations: ChatConversationsService,
    private readonly storage: StorageService,
    @InjectRepository(ChatUpload)
    private readonly uploads: Repository<ChatUpload>,
    @InjectRepository(ChatMessageAttachment)
    private readonly attachments: Repository<ChatMessageAttachment>,
  ) {
    this.secret =
      config.get<string>('FILE_URL_SECRET') ??
      config.getOrThrow<string>('JWT_SECRET');
    this.publicApiUrl =
      config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:4000';
  }

  // ---------------------------------------------------------------- upload

  /**
   * Step 1 of sending a file: upload it, get an id back.
   * Step 2: send a message with attachmentIds: [id].
   */
  async uploadFile(
    userId: string,
    conversationId: string,
    file: { buffer: Buffer; size: number; originalname: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('File is required (field name: file)');

    if (!this.limiter.check(userId)) {
      throw new HttpException('Too many uploads, try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    const { order } = await this.conversations.validateConversationAccess(
      conversationId,
      userId,
    );
    this.conversations.assertOpen(order);

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File is too large (max 5 MB)');
    }

    const mimeType = detectMime(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `chat/${conversationId}/${randomUUID()}.${EXTENSIONS[mimeType]}`;

    await this.storage.put(storageKey, file.buffer);

    const upload = await this.uploads.save(
      this.uploads.create({
        uploadedBy: userId,
        conversationId,
        storageKey,
        originalFilename: safeFilename(file.originalname),
        mimeType,
        sizeBytes: file.size,
        checksum,
        status: 'uploaded',
        expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
      }),
    );

    return {
      id: upload.id,
      originalFilename: upload.originalFilename,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      expiresAt: upload.expiresAt,
    };
  }

  // ---------------------------------------------------------------- download

  /**
   * Short lived signed link. An <img> tag cannot send the Authorization header,
   * so the link itself proves the access (it is issued only to a participant).
   */
  async getAttachmentDownloadUrl(userId: string, attachmentId: string) {
    const attachment = await this.attachments.findOne({
      where: { id: attachmentId },
      relations: { message: true },
    });
    if (!attachment || !attachment.message) {
      throw new NotFoundException('Attachment not found');
    }

    await this.conversations.validateConversationAccess(
      attachment.message.conversationId,
      userId,
    );

    const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_URL_TTL_SECONDS;
    const sig = this.sign(attachment.id, exp);

    return {
      url: `${this.publicApiUrl}/chat/files/${attachment.id}?exp=${exp}&sig=${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  /** used by GET /chat/files/:id, which is protected by the signature only */
  async openFile(attachmentId: string, exp: number, sig: string) {
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new ForbiddenException('This link has expired');
    }

    const given = Buffer.from(sig, 'hex');
    const expected = Buffer.from(this.sign(attachmentId, exp), 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new ForbiddenException('Invalid link');
    }

    const attachment = await this.attachments.findOne({
      where: { id: attachmentId },
    });
    if (!attachment || !(await this.storage.exists(attachment.storageKey))) {
      throw new NotFoundException('File not found');
    }

    return {
      stream: this.storage.read(attachment.storageKey),
      mimeType: attachment.mimeType,
      filename: attachment.originalFilename,
    };
  }

  private sign(attachmentId: string, exp: number) {
    return createHmac('sha256', this.secret)
      .update(`${attachmentId}.${exp}`)
      .digest('hex');
  }

  // ---------------------------------------------------------------- cleanup

  /** uploads that were never attached to a message are removed after they expire */
  @Interval(10 * 60 * 1000)
  async deleteUnusedUploads() {
    try {
      const expired = await this.uploads.find({
        where: { status: 'uploaded', expiresAt: LessThan(new Date()) },
        take: 100,
      });

      for (const upload of expired) {
        await this.storage.delete(upload.storageKey);
        await this.uploads.delete({ id: upload.id });
      }

      if (expired.length) {
        this.logger.log(`deleted ${expired.length} unused uploads`);
      }
    } catch (err) {
      this.logger.error(`cleanup failed: ${(err as Error).message}`);
    }
  }
}
