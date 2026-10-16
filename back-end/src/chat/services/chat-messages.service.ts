import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CHAT_EVENTS } from '../chat.constants.js';
import { ListMessagesQueryDto, SendMessageDto } from '../chat.dto.js';
import { SlidingWindowLimiter } from '../rate-limiter.js';
import { ChatMessageAttachment } from '../entities/chat-message-attachment.entity.js';
import { ChatMessage, MessageType } from '../entities/chat-message.entity.js';
import { ChatUpload } from '../entities/chat-upload.entity.js';
import { ChatConversationsService } from './chat-conversations.service.js';
import { ChatEventsService } from './chat-events.service.js';
import { ChatReadStatusService } from './chat-read-status.service.js';

/** what the client receives (no storage keys, no internal columns) */
export interface ChatMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  clientMessageId: string | null;
  createdAt: Date;
  attachments: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }[];
}

export interface CreatedMessage {
  message: ChatMessageView;
  recipientId: string;
  duplicate: boolean;
}

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);
  private readonly limiter = new SlidingWindowLimiter(30, 60_000); // 30 messages per minute per user

  constructor(
    private readonly dataSource: DataSource,
    private readonly conversations: ChatConversationsService,
    private readonly readStatus: ChatReadStatusService,
    private readonly events: ChatEventsService,
  ) {}

  // ---------------------------------------------------------------- send

  /**
   * Saves the message, then (only after the commit) tells the other side about it.
   * A message:new event is never sent before the message is really in the database.
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageView> {
    if (!this.limiter.check(userId)) {
      throw new HttpException(
        'You are sending messages too fast',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let created: CreatedMessage;
    try {
      created = await this.dataSource.transaction((em) =>
        this.createInTransaction(em, userId, conversationId, dto),
      );
    } catch (err: any) {
      // 23505 = unique violation: the same clientMessageId arrived twice at the same moment
      if (err?.code === '23505' && dto.clientMessageId) {
        const existing = await this.findByClientMessageId(
          userId,
          dto.clientMessageId,
        );
        if (existing) return existing;
      }
      throw err;
    }

    if (!created.duplicate) {
      await this.publish(created.message, created.recipientId);
    }
    return created.message;
  }

  /**
   * Does the database work only, inside a transaction owned by the caller.
   * The order flow uses it so "mark as paid" and "send the proof" succeed or fail together.
   * After the commit the caller must call publish().
   */
  async createInTransaction(
    em: EntityManager,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<CreatedMessage> {
    const content = dto.content?.trim() || null;
    const attachmentIds = [...new Set(dto.attachmentIds ?? [])];

    if (!content && attachmentIds.length === 0) {
      throw new BadRequestException('A message needs text or an attachment');
    }

    // the sender must be the buyer or the seller of the order, and the order must be open
    const { order } = await this.conversations.validateConversationAccess(
      conversationId,
      userId,
      em,
    );
    this.conversations.assertOpen(order);
    const recipientId =
      order.buyerId === userId ? order.sellerId : order.buyerId;

    // retry protection
    if (dto.clientMessageId) {
      const existing = await em.findOne(ChatMessage, {
        where: { senderId: userId, clientMessageId: dto.clientMessageId },
        relations: { attachments: true },
      });
      if (existing) {
        return { message: this.serialize(existing), recipientId, duplicate: true };
      }
    }

    // attachments: they must be mine, from this conversation, uploaded and not used yet
    let uploads: ChatUpload[] = [];
    if (attachmentIds.length) {
      uploads = await em.find(ChatUpload, {
        where: {
          id: In(attachmentIds),
          uploadedBy: userId,
          conversationId,
          status: 'uploaded',
        },
      });

      const now = Date.now();
      if (
        uploads.length !== attachmentIds.length ||
        uploads.some((u) => u.expiresAt.getTime() < now)
      ) {
        throw new BadRequestException(
          'One or more attachments are invalid or expired',
        );
      }

      // claim them; if another request took one meanwhile the count will not match
      const claimed = await em.update(
        ChatUpload,
        { id: In(attachmentIds), status: 'uploaded' },
        { status: 'attached' },
      );
      if (claimed.affected !== attachmentIds.length) {
        throw new BadRequestException('One or more attachments were already used');
      }
    }

    const type: MessageType =
      uploads.length === 0
        ? 'text'
        : uploads.every((u) => u.mimeType.startsWith('image/'))
          ? 'image'
          : 'file';

    const message = await em.save(
      em.create(ChatMessage, {
        conversationId,
        senderId: userId, // from the JWT, never from the body
        clientMessageId: dto.clientMessageId ?? null,
        type,
        content,
      }),
    );

    message.attachments = uploads.length
      ? await em.save(
          uploads.map((u) =>
            em.create(ChatMessageAttachment, {
              messageId: message.id,
              storageKey: u.storageKey,
              originalFilename: u.originalFilename,
              mimeType: u.mimeType,
              sizeBytes: u.sizeBytes,
              checksum: u.checksum,
            }),
          ),
        )
      : [];

    // moves the conversation to the top of the list
    await em.query(
      'UPDATE chat_conversations SET updated_at = now() WHERE id = $1',
      [conversationId],
    );

    return { message: this.serialize(message), recipientId, duplicate: false };
  }

  /** real-time part, called after the transaction is committed; it never fails the request */
  async publish(message: ChatMessageView, recipientId: string) {
    try {
      this.events.emitToConversation(
        message.conversationId,
        CHAT_EVENTS.NEW,
        message,
      );

      const unreadCount = await this.readStatus.getConversationUnreadCount(
        recipientId,
        message.conversationId,
      );
      const totalUnread = await this.readStatus.getUnreadCount(recipientId);

      this.events.emitToUser(recipientId, CHAT_EVENTS.UNREAD_UPDATED, {
        conversationId: message.conversationId,
        unreadCount,
        totalUnread,
      });
    } catch (err) {
      // the message is already saved; the other side will get it from the REST API
      this.logger.error(`publish failed: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------- read

  /**
   * Cursor pagination on the message id.
   *  - no cursor / before: newest first, pass nextCursor as "before" to go back in time
   *  - after: oldest first, used to catch up after a reconnect
   */
  async getMessages(
    userId: string,
    conversationId: string,
    q: ListMessagesQueryDto,
  ) {
    await this.conversations.validateConversationAccess(conversationId, userId);

    const limit = q.limit ?? 30;

    const qb = this.dataSource
      .getRepository(ChatMessage)
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.attachments', 'a')
      .where('m.conversationId = :conversationId', { conversationId });

    if (q.after) {
      qb.andWhere('m.id > :after', { after: q.after }).orderBy('m.id', 'ASC');
    } else {
      if (q.before) qb.andWhere('m.id < :before', { before: q.before });
      qb.orderBy('m.id', 'DESC');
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((m) => this.serialize(m)),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async getMessageById(messageId: string) {
    const message = await this.dataSource.getRepository(ChatMessage).findOne({
      where: { id: messageId },
      relations: { attachments: true },
    });
    return message ? this.serialize(message) : null;
  }

  // ---------------------------------------------------------------- helpers

  private async findByClientMessageId(userId: string, clientMessageId: string) {
    const message = await this.dataSource.getRepository(ChatMessage).findOne({
      where: { senderId: userId, clientMessageId },
      relations: { attachments: true },
    });
    return message ? this.serialize(message) : null;
  }

  private serialize(message: ChatMessage): ChatMessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      content: message.content,
      clientMessageId: message.clientMessageId,
      createdAt: message.createdAt,
      attachments: (message.attachments ?? []).map((a) => ({
        id: a.id,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    };
  }
}
