import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('sweeps')
export class Sweep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deposit_address_id: number;

  @Column()
  chain_id: number;

  // in wei, stored as a string
  @Column({ type: 'numeric', precision: 78, scale: 0 })
  amount: string;

  @Column()
  tx_hash: string;

  @Column({ default: 'success' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
