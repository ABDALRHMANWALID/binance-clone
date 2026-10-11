import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Contract, Interface, Wallet, formatEther, parseEther } from 'ethers';
import { BlockchainService } from '../../blockchain/blockchain.service.js';
import { uuidToUint } from '../../blockchain/utilies/uuid.util.js';
import { DepositAddress } from '../entities/depositAddress.js';
import { Sweep } from '../entities/sweep.js';

// used to read the swept amount out of the transaction receipt
const SWEPT_IFACE = new Interface([
  'event Swept(address indexed to, uint256 amount)',
]);

@Injectable()
export class DepositSweeperService {
  private readonly logger = new Logger(DepositSweeperService.name);
  private running = false;
  private readonly enabled: boolean;
  private readonly chainId: number;
  private readonly confirmations: number;
  private readonly minSweepWei: bigint;
  private readonly gasMultiplier: bigint;
  private readonly maxPerRun: number;
  private readonly signer: Wallet;
  constructor(
    private readonly config: ConfigService,
    private readonly blockchain: BlockchainService,
    @InjectRepository(DepositAddress)
    private readonly addressRepo: Repository<DepositAddress>,
    @InjectRepository(Sweep)
    private readonly sweepRepo: Repository<Sweep>,
  ) {
    this.enabled = config.get('SWEEP_ENABLED') === 'true';
    this.chainId = Number(config.getOrThrow('SEPOLIA_CHAIN_ID'));
    this.confirmations = Number(config.get('CONFIRMATIONS') ?? 2);
    this.minSweepWei = parseEther(
      config.get<string>('SWEEP_MIN_ETH') ?? '0.001',
    );
    this.gasMultiplier = BigInt(config.get('SWEEP_GAS_MULTIPLIER') ?? 3);
    this.maxPerRun = Number(config.get('SWEEP_MAX_PER_RUN') ?? 10);
    // the owner wallet: signs the sweep transactions and pays their gas
    this.signer = new Wallet(
      config.getOrThrow<string>('OWNER_KEY'),
      blockchain.provider,
    );
  }

  // runs every 60 seconds
  @Interval(60_000)
  async run() {
    if (!this.enabled) return;
    if (this.running) return; // the previous run is still sending transactions
    this.running = true;
    try {
      await this.sweepAll();
    } catch (err) {
      this.logger.error(`sweep run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async sweepAll() {
    const provider = this.blockchain.provider;
    const latest = await provider.getBlockNumber();
    const safeBlock = latest - this.confirmations;
    // the factory connected to the owner wallet, so it can send transactions
    const factory = this.blockchain.factory.connect(this.signer) as Contract;
    const addresses = await this.addressRepo.find({
      where: { chain_id: this.chainId },
    });
    let sent = 0;
    for (const row of addresses) {
      if (sent >= this.maxPerRun) break;

      try {
        if (await this.trySweep(factory, row, safeBlock)) sent++;
      } catch (err) {
        // one failing address must not stop the others
        this.logger.error(
          `sweep failed for ${row.address}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async trySweep(
    factory: Contract,
    row: DepositAddress,
    safeBlock: number,
  ): Promise<boolean> {
    const provider = this.blockchain.provider;
    const userId = uuidToUint(row.user_id);
    // 1) the stored address must belong to the CURRENT factory
    const predicted: string = await factory.predict(userId);
    if (predicted.toLowerCase() !== row.address.toLowerCase()) {
      this.logger.warn(
        `${row.address} does not match the current factory, skipping`,
      );
      return false;
    }

    // 2) only look at ETH that already has enough confirmations
    const balance = await provider.getBalance(row.address, safeBlock);

    if (balance < this.minSweepWei) return false;

    // 3) is it worth the gas?
    const gasUnits: bigint = await factory.sweepETH.estimateGas(userId);
    const fee = await provider.getFeeData();
    const gasPrice = fee.maxFeePerGas ?? fee.gasPrice ?? BigInt(0);
    const gasCost = gasUnits * gasPrice;

    if (balance < gasCost * this.gasMultiplier) {
      this.logger.log(
        `skip ${row.address}: ${formatEther(balance)} ETH is too small for ` +
          `${formatEther(gasCost)} ETH of gas`,
      );
      return false;
    }

    // 4) send the sweep and wait for it to be mined
    const tx = await factory.sweepETH(userId);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error(`sweep transaction ${tx.hash} failed`);
    }

    // 5) read the swept amount from the Swept event
    let amount = BigInt(0);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== row.address.toLowerCase()) continue;
      const parsed = SWEPT_IFACE.parseLog({
        topics: [...log.topics],
        data: log.data,
      });

      if (parsed?.name === 'Swept') amount = parsed.args.amount;
    }

    // 6) record it
    await this.sweepRepo.save({
      deposit_address_id: row.id,
      chain_id: this.chainId,
      amount: amount.toString(),
      tx_hash: tx.hash,
      status: 'success',
    });

    this.logger.log(
      `swept ${formatEther(amount)} ETH from ${row.address} (tx ${tx.hash})`,
    );
    return true;
  }
}
