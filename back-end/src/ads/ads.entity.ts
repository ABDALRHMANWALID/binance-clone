import {
  Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from '../payment-methods/payment-method.entity.js';
import { User } from '../auth/user.entity.js';

export type AdSide = 'buy' | 'sell';
export type AdStatus = 'active' | 'paused' | 'closed';

@Entity('ads')
export class Ad {
  // الجدول لازم يكون عنده DEFAULT gen_random_uuid() على عمود id
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // الـ union types لازم نحدد لها type صراحة، وإلا TypeORM هيشتكي من "Object"
  @Column({ type: 'text' })
  side: AdSide;

  @Column({ type: 'text', default: 'USDT' })
  asset: string;

  @Column({ type: 'text', default: 'EGP' })
  fiat: string;

  // كل NUMERIC بيرجع string
  @Column({ type: 'numeric', precision: 20, scale: 6 })
  price: string;

  @Column({ type: 'numeric', precision: 38, scale: 0 })
  total: string;

  @Column({ type: 'numeric', precision: 38, scale: 0 })
  remaining: string;

  @Column({ name: 'min_fiat', type: 'numeric', precision: 20, scale: 6 })
  minFiat: string;

  @Column({ name: 'max_fiat', type: 'numeric', precision: 20, scale: 6 })
  maxFiat: string;

  @Column({ type: 'text', default: 'active' })
  status: AdStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // جدول الربط ad_payment_methods اللي في الـ schema
  @ManyToMany(() => PaymentMethod)
  @JoinTable({
    name: 'ad_payment_methods',
    joinColumn: { name: 'ad_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'payment_method_id', referencedColumnName: 'id' },
  })
  paymentMethods: PaymentMethod[];
}
