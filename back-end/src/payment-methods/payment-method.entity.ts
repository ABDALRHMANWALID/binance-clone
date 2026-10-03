import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// الـ entity بتطابق جدول payment_methods اللي في schema.sql بالظبط.
// الأعمدة بـ snake_case في الـ DB، والـ properties بـ camelCase في الكود، والربط بينهم بـ { name: '...' }.
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: string;

  /** bank | vodafone_cash | instapay ... */
  @Column()
  type: string;

  @Column({ name: 'holder_name' })
  holderName: string;

  @Column({ name: 'account_details' })
  accountDetails: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
