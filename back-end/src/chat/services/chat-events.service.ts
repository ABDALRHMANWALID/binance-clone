import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { conversationRoom, userRoom } from '../chat.constants.js';

/**
 * The only place that talks to the socket server.
 * The gateway gives it the server once, and the services use it to push events.
 * Keeping it separate avoids a circular dependency between the gateway and the services.
 */
@Injectable()
export class ChatEventsService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(conversationRoom(conversationId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }
}
