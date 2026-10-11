import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('chain_cursors')
export class ChainCursor {
  @PrimaryColumn()
  chain_id: number;

  @Column({type: 'bigint' })
  last_processed_block: string;
}