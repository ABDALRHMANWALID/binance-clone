import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { MAX_UPLOAD_BYTES } from './chat.constants.js';
import {
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  MarkReadDto,
  SendMessageDto,
} from './chat.dto.js';
import { ChatAttachmentsService } from './services/chat-attachments.service.js';
import { ChatConversationsService } from './services/chat-conversations.service.js';
import { ChatMessagesService } from './services/chat-messages.service.js';
import { ChatReadStatusService } from './services/chat-read-status.service.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly conversations: ChatConversationsService,
    private readonly messages: ChatMessagesService,
    private readonly readStatus: ChatReadStatusService,
    private readonly attachments: ChatAttachmentsService,
  ) {}

  @Get('conversations')
  listConversations(
    @CurrentUser() user: { id: string },
    @Query() q: ListConversationsQueryDto,
  ) {
    return this.conversations.getUserConversations(user.id, q);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversations.getConversationById(user.id, id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: ListMessagesQueryDto,
  ) {
    return this.messages.getMessages(user.id, id, q);
  }

  // same service as the WebSocket event, kept as a fallback when the socket is down
  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendMessage(user.id, id, dto);
  }

  @Post('conversations/:id/read')
  markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.readStatus.markConversationAsRead(
      user.id,
      id,
      dto.lastReadMessageId,
    );
  }

  /** total unread + unread per conversation; call it on login and after a reconnect */
  @Get('unread')
  async unread(@CurrentUser() user: { id: string }) {
    const counts = await this.readStatus.getUnreadCountsByConversation(user.id);
    let total = 0;
    const conversations: { conversationId: string; unreadCount: number }[] = [];
    for (const [conversationId, unreadCount] of counts) {
      total += unreadCount;
      conversations.push({ conversationId, unreadCount });
    }
    return { total, conversations };
  }

  /** multipart/form-data with a field called "file" */
  @Post('conversations/:id/uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Parameters<ChatAttachmentsService['uploadFile']>[2],
  ) {
    return this.attachments.uploadFile(user.id, id, file);
  }

  @Get('attachments/:id/url')
  attachmentUrl(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attachments.getAttachmentDownloadUrl(user.id, id);
  }
}
