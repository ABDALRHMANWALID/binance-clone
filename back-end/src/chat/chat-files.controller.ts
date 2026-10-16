import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ChatAttachmentsService } from './services/chat-attachments.service.js';

/**
 * No JWT guard on purpose: <img src="..."> cannot send an Authorization header.
 * The signed, short lived link (issued only to participants) is the protection.
 */
@Controller('chat/files')
export class ChatFilesController {
  constructor(private readonly attachments: ChatAttachmentsService) {}

  @Get(':id')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, max-age=300')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
  ) {
    const file = await this.attachments.openFile(id, Number(exp), sig ?? '');

    // images are shown in the page, anything else (PDF) is downloaded
    const disposition = file.mimeType.startsWith('image/') ? 'inline' : 'attachment';

    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    });
  }
}
