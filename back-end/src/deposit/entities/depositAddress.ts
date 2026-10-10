import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('deposit_addresses')
export class DepositAddress {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('uuid')
    user_id: string;

    @Column({
        type: 'integer',
        default: 31337,
    })
    chain_id: number;

    @Column({ length: 100 })
    asset: string;

    @Column({
        type: 'varchar',
        length: 42,
        unique: true,
    })
    address: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}