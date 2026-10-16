import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ChatConversation } from './chat-conversation.entity.js';
import type { Relation } from 'typeorm';

/**
 * Where each participant stopped reading.
 * A row exists only for the two participants, so it also tells who belongs to the conversation.
 */
@Entity('chat_participant_reads')
export class ChatParticipantRead {
  @PrimaryColumn({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Relation<ChatConversation>;

  @Column({ name: 'last_read_message_id', type: 'bigint', nullable: true })
  lastReadMessageId: string | null;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;
}
