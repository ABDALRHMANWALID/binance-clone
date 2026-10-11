import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource, Repository } from 'typeorm';
import { TransactionResponse, formatEther } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { DepositAddress } from './entities/depositAddress.js';
import { Deposit } from './entities/deposit.js';
import { ChainCursor } from './entities/chain_cursors.js';

@Injectable()
export class DepositsListenerService implements OnModuleInit {
  private readonly logger = new Logger(DepositsListenerService.name);
  private running = false;

  private readonly chain_id: number;
  private readonly asset: string;
  private readonly confirmations: number;
  private readonly maxBlocksPerTick: number;

  constructor(
    private readonly config: ConfigService,
    private readonly blockchain: BlockchainService,
    private readonly dataSource: DataSource,
    @InjectRepository(DepositAddress)
    private readonly addressRepo: Repository<DepositAddress>,
    @InjectRepository(ChainCursor)
    private readonly cursorRepo: Repository<ChainCursor>,
  ) {
    this.chain_id = Number(config.getOrThrow('SEPOLIA_CHAIN_ID'));
    this.asset = config.get<string>('ASSET_SYMBOL') ?? 'ETH';
    this.confirmations = Number(config.get('CONFIRMATIONS') ?? 2);
    this.maxBlocksPerTick = Number(config.get('MAX_BLOCKS_PER_TICK') ?? 50);
  }

  onModuleInit() {
    this.logger.log('listener created, polling every 15s');
  }

  @Interval(15_000)
  async poll() {
    this.logger.log('poll tick'); // remove after you confirm it works
    if (this.running) return;
    this.running = true;
    try {
      await this.scan();
    } catch (err) {
      this.logger.error(`scan failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async scan() {
    const latest = await this.blockchain.provider.getBlockNumber();
    const safeBlock = latest - this.confirmations;

    let cursor = await this.cursorRepo.findOne({
      where: { chain_id: this.chain_id },
    });
    if (!cursor) {
      const start = Number(this.config.get('START_BLOCK') ?? latest);
      cursor = await this.cursorRepo.save({
        chain_id: this.chain_id,
        last_processed_block: String(start - 1),
      });
      this.logger.log(`cursor created, scanning from block ${start}`);
    }

    const from = Number(cursor.last_processed_block) + 1;
    if (from > safeBlock) return;
    const to = Math.min(safeBlock, from + this.maxBlocksPerTick - 1);

    const addresses = await this.addressRepo.find({
      where: { chain_id: this.chain_id },
    });
    const byAddress = new Map(
      addresses.map((a) => [a.address.toLowerCase(), a]),
    );

    for (let n = from; n <= to; n++) {
      if (byAddress.size > 0) await this.scanBlock(n, byAddress);
      await this.cursorRepo.update(
        { chain_id: this.chain_id },
        { last_processed_block: String(n) },
      );
    }
  }

  private async scanBlock(
    blockNumber: number,
    byAddress: Map<string, DepositAddress>,
  ) {
    const block = await this.blockchain.provider.getBlock(blockNumber, true);
    if (!block) return;

    for (const tx of block.prefetchedTransactions) {
      if (!tx.to || tx.value === BigInt(0)) continue;

      const owner = byAddress.get(tx.to.toLowerCase());
      if (!owner) continue;

      const receipt = await this.blockchain.provider.getTransactionReceipt(tx.hash);
      if (!receipt || receipt.status !== 1) continue;

      await this.handleDeposit(tx, owner);
    }
  }

  private async handleDeposit(tx: TransactionResponse, owner: DepositAddress) {
    const amount: bigint = tx.value; // wei

    try {
      await this.dataSource.transaction(async (manager) => {
        // a) record the deposit (adjust the field names to your Deposit entity)
        await manager.insert(Deposit, {
          user_id: owner.user_id,
          deposit_address: owner.id,
          asset: this.asset,
          tx_hash: tx.hash,
          log_index: 0,
          amount: amount.toString(),
          block_number: tx.blockNumber!,
        });

        // b) credit the existing balances table
        await manager.query(
          `INSERT INTO balances (user_id, asset, available, locked)
           VALUES ($1, $2, $3, 0)
           ON CONFLICT (user_id, asset)
           DO UPDATE SET available = balances.available + EXCLUDED.available`,
          [owner.user_id, this.asset, formatEther(amount)],
        );
      });

      this.logger.log(`deposit ${amount} wei -> user ${owner.user_id} (tx ${tx.hash})`);
    } catch (err: any) {
      if (err?.code === '23505') return; // already processed
      throw err;
    }
  }
}