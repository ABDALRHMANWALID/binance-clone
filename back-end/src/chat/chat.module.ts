import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Order } from '../orders/order.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatFilesController } from './chat-files.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatConversation } from './entities/chat-conversation.entity.js';
import { ChatMessageAttachment } from './entities/chat-message-attachment.entity.js';
import { ChatMessage } from './entities/chat-message.entity.js';
import { ChatParticipantRead } from './entities/chat-participant-read.entity.js';
import { ChatUpload } from './entities/chat-upload.entity.js';
import { ChatAttachmentsService } from './services/chat-attachments.service.js';
import { ChatConversationsService } from './services/chat-conversations.service.js';
import { ChatEventsService } from './services/chat-events.service.js';
import { ChatMessagesService } from './services/chat-messages.service.js';
import { ChatReadStatusService } from './services/chat-read-status.service.js';
import { StorageService } from './services/storage.service.js';

@Module({
  imports: [
    AuthModule,
    // used by the gateway to verify the token sent in the socket handshake
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([
      ChatConversation,
      ChatMessage,
      ChatMessageAttachment,
      ChatParticipantRead,
      ChatUpload,
      Order,
    ]),
  ],
  controllers: [ChatController, ChatFilesController],
  providers: [
    ChatEventsService,
    StorageService,
    ChatReadStatusService,
    ChatConversationsService,
    ChatAttachmentsService,
    ChatMessagesService,
    ChatGateway,
  ],
  // the orders module creates the conversation and sends the payment proof
  exports: [ChatConversationsService, ChatMessagesService, ChatEventsService],
})
export class ChatModule {}
