import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import {
  CHAT_EVENTS,
  conversationRoom,
  userRoom,
} from './chat.constants.js';
import {
  JoinConversationDto,
  WsMarkReadDto,
  WsSendMessageDto,
} from './chat.dto.js';
import { ChatConversationsService } from './services/chat-conversations.service.js';
import { ChatEventsService } from './services/chat-events.service.js';
import { ChatMessagesService } from './services/chat-messages.service.js';
import { ChatReadStatusService } from './services/chat-read-status.service.js';

/**
 * Real-time layer only. All the business rules live in the services,
 * so REST and WebSocket behave exactly the same.
 *
 * Client:  io('http://localhost:4000/chat', { auth: { token } })
 */
@WebSocketGateway({
  namespace: '/chat',
  // change this to your real front-end URL in production
  cors: { origin: ['http://localhost:3000'], credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly events: ChatEventsService,
    private readonly conversations: ChatConversationsService,
    private readonly messages: ChatMessagesService,
    private readonly readStatus: ChatReadStatusService,
  ) {}

  afterInit(server: Server) {
    this.events.setServer(server);
  }

  // ---------------------------------------------------------------- connection

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwt.verifyAsync<{ sub?: string; id?: string }>(
        token,
      );

      // adjust if your JWT stores the user id under another key
      const userId = payload.sub ?? payload.id;
      if (!userId) throw new Error('missing user id');

      client.data.userId = userId;

      // a personal room: unread counters and order updates reach every tab of this user
      await client.join(userRoom(userId));
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect() {
    // rooms are cleaned by socket.io; the messages are already in the database
  }

  // ---------------------------------------------------------------- events

  @SubscribeMessage(CHAT_EVENTS.JOIN)
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    try {
      const dto = this.parse(JoinConversationDto, body);
      await this.conversations.validateConversationAccess(
        dto.conversationId,
        this.userId(client),
      );
      await client.join(conversationRoom(dto.conversationId));
      client.emit(CHAT_EVENTS.JOINED, { conversationId: dto.conversationId });
      return { ok: true };
    } catch (err) {
      return this.fail(err);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.LEAVE)
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    try {
      const dto = this.parse(JoinConversationDto, body);
      await client.leave(conversationRoom(dto.conversationId));
      return { ok: true };
    } catch (err) {
      return this.fail(err);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.SEND)
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    const raw = (body ?? {}) as { conversationId?: string; clientMessageId?: string };

    try {
      const dto = this.parse(WsSendMessageDto, body);
      // the sender is the authenticated user, whatever the payload says
      const message = await this.messages.sendMessage(
        this.userId(client),
        dto.conversationId,
        dto,
      );
      // message:new is pushed to the room by the service after the commit
      return { ok: true, message };
    } catch (err) {
      const error = this.messageOf(err);
      client.emit(CHAT_EVENTS.FAILED, {
        conversationId: raw.conversationId,
        clientMessageId: raw.clientMessageId,
        error,
      });
      return { ok: false, error };
    }
  }

  @SubscribeMessage(CHAT_EVENTS.READ)
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    try {
      const dto = this.parse(WsMarkReadDto, body);
      const result = await this.readStatus.markConversationAsRead(
        this.userId(client),
        dto.conversationId,
        dto.lastReadMessageId,
      );
      return { ok: true, ...result };
    } catch (err) {
      return this.fail(err);
    }
  }

  // ---------------------------------------------------------------- helpers

  private extractToken(client: Socket): string {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    throw new Error('missing token');
  }

  private userId(client: Socket): string {
    const id = client.data.userId as string | undefined;
    if (!id) throw new WsException('Unauthorized');
    return id;
  }

  /** validates a payload with the same class-validator DTOs used by REST */
  private parse<T extends object>(cls: new () => T, body: unknown): T {
    const instance = plainToInstance(cls, body ?? {});
    const errors = validateSync(instance, { whitelist: true });
    if (errors.length) {
      const first = Object.values(errors[0].constraints ?? {})[0];
      throw new WsException(first ?? 'Invalid payload');
    }
    return instance;
  }

  private messageOf(err: unknown): string {
    if (err instanceof HttpException || err instanceof WsException) {
      return err instanceof WsException
        ? String(err.getError())
        : err.message;
    }
    return 'Something went wrong';
  }

  private fail(err: unknown) {
    return { ok: false, error: this.messageOf(err) };
  }
}
