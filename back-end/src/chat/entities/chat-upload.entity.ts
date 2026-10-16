import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UploadStatus = 'uploaded' | 'attached' | 'rejected';

/**
 * A file that was uploaded but is not attached to a message yet.
 * Uploading first and sending the message after lets the user retry the message
 * without uploading the file again.
 */
@Entity('chat_uploads')
@Index(['status', 'expiresAt'])
export class ChatUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  // an upload can only be attached to a message of the same conversation
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ name: 'original_filename', type: 'text' })
  originalFilename: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  @Column({ type: 'text', nullable: true })
  checksum: string | null;

  @Column({ type: 'text', default: 'uploaded' })
  status: UploadStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
