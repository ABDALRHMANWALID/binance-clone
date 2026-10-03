import { Column, Entity, PrimaryColumn } from 'typeorm';

// المبالغ NUMERIC في الـ DB، وTypeORM بيرجعها string. بنحولها BigInt في الكود عند الحساب.
@Entity('balances')
export class Balance {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'text' })
  asset: string;

  @Column({ type: 'numeric', precision: 38, scale: 0 })
  available: string;

  @Column({ type: 'numeric', precision: 38, scale: 0 })
  locked: string;
}
