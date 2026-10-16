import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CHAT_EVENTS } from '../chat.constants.js';
import { ChatEventsService } from './chat-events.service.js';

@Injectable()
export class ChatReadStatusService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly events: ChatEventsService,
  ) {}

  /**
   * Unread = messages sent by the OTHER user after my read cursor.
   * The database is the source of truth, not the socket connection.
   */
  async getUnreadCountsByConversation(
    userId: string,
    conversationIds?: string[],
  ): Promise<Map<string, number>> {
    const params: unknown[] = [userId];
    let filter = '';

    if (conversationIds) {
      if (conversationIds.length === 0) return new Map();
      params.push(conversationIds);
      filter = 'AND m.conversation_id = ANY($2::uuid[])';
    }

    const rows: { conversationId: string; unread: number }[] =
      await this.dataSource.query(
        `SELECT m.conversation_id AS "conversationId", COUNT(*)::int AS "unread"
         FROM chat_messages m
         JOIN chat_participant_reads r
           ON r.conversation_id = m.conversation_id AND r.user_id = $1
         WHERE m.sender_id <> $1
           AND m.deleted_at IS NULL
           AND (r.last_read_message_id IS NULL OR m.id > r.last_read_message_id)
           ${filter}
         GROUP BY m.conversation_id`,
        params,
      );

    return new Map(rows.map((r) => [r.conversationId, r.unread]));
  }

  async getUnreadCount(userId: string) {
    const counts = await this.getUnreadCountsByConversation(userId);
    let total = 0;
    for (const n of counts.values()) total += n;
    return total;
  }

  async getConversationUnreadCount(userId: string, conversationId: string) {
    const counts = await this.getUnreadCountsByConversation(userId, [
      conversationId,
    ]);
    return counts.get(conversationId) ?? 0;
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
    lastReadMessageId: string,
  ) {
    // a row exists only for the two participants
    const member = await this.dataSource.query(
      `SELECT 1 FROM chat_participant_reads WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    if (!member.length) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // the message must belong to this conversation
    const message = await this.dataSource.query(
      `SELECT 1 FROM chat_messages
       WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL`,
      [lastReadMessageId, conversationId],
    );
    if (!message.length) {
      throw new BadRequestException(
        'Message does not belong to this conversation',
      );
    }

    // the cursor only moves forward
    await this.dataSource.query(
      `UPDATE chat_participant_reads
       SET last_read_message_id = $3, last_read_at = now()
       WHERE conversation_id = $1 AND user_id = $2
         AND (last_read_message_id IS NULL OR last_read_message_id < $3)`,
      [conversationId, userId, lastReadMessageId],
    );

    const unreadCount = await this.getConversationUnreadCount(
      userId,
      conversationId,
    );
    const totalUnread = await this.getUnreadCount(userId);

    const payload = { conversationId, unreadCount, totalUnread };
    this.events.emitToUser(userId, CHAT_EVENTS.UNREAD_UPDATED, payload);
    return payload;
  }
}
