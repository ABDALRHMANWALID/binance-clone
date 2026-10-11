import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('balances')
export class Balance {
    @PrimaryColumn('uuid')
    id: string;

    @Column()
    asset: string;

    @Column({ type: 'numeric', precision: 38, scale: 18, default: 0 })
    available: string;

    @Column({ type: 'numeric', precision: 38, scale: 18, default: 0 })
    locked: string;
}