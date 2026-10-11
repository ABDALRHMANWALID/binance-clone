import { IsOptional } from 'class-validator';
import {
    Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique,
} from 'typeorm';


@Entity('deposits')
@Unique(['tx_hash', 'log_index'])
@Index(['deposit_address', 'createdAt'])
export class Deposit {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('uuid')
    user_id: string;

    @Column({
        type: 'integer',
        default: 11155111,
    })
    chain_id: number;

    @Column()
    asset: string;

    @Column({ nullable: true })
    token_address: string;

    @Column()
    deposit_address: number;

    @Column()
    tx_hash: string;

    @Column()
    log_index: number;

    // stored in wei (1 ETH = 10^18 wei), as a string
    @Column({ type: 'numeric', precision: 78, scale: 0 })
    amount: string;

    @Column()
    block_number: number;

    @CreateDateColumn({ nullable: true })
    swept_at: Date;
  
    @Column({ nullable: true })
    sweep_tx_hash: string;

    @CreateDateColumn()
    createdAt: Date;
}