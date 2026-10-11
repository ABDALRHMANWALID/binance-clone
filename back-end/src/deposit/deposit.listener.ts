import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { formatUnits, getAddress } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { DepositAddress } from './entities/depositAddress.js';
import { Deposit } from './entities/deposit.js';
import { uuidToUint } from '../blockchain/utilies/uuid.util.js';

@Injectable()
export class DepositsListenerService {
    private readonly decimals: number;

    constructor(
        config: ConfigService,
        private readonly blockchain: BlockchainService,
        @InjectRepository(DepositAddress)
        private readonly repo: Repository<DepositAddress>,
        @InjectRepository(Deposit)
        private readonly depositRepo: Repository<Deposit>,
    ) {
        this.decimals = Number(config.get('ASSET_DECIMALS') ?? 18);
    }

    async getOrCreateDepositAddress(user_id: string, chain_id: number) {
        const existing = await this.repo.findOne({ where: { user_id, chain_id } });
        if (existing) return existing.address;

        const address: string = await this.blockchain.factory.predict(
            uuidToUint(user_id),
        );
        return this.repo.save({ user_id, chain_id, address });
    }

    async waitForDeposit(
        user_id: string,
        address: string,
        since: Date,
        timeoutMs = 25_000,
    ) {
        // 1) normalize the address and make sure it belongs to this user
        let checksummed: string;
        try {
            checksummed = getAddress(address);
        } catch {
            throw new BadRequestException('Invalid address');
        }

        const owned = await this.repo.findOne({
            where: { user_id, address: checksummed },
        });
        if (!owned) throw new NotFoundException('Address not found');

        // 2) check the database every 2 seconds until a new deposit appears
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const deposit = await this.depositRepo.findOne({
                where: { deposit_address: owned.id, createdAt: MoreThan(since) },
                order: { createdAt: 'ASC' },
            });

            if (deposit) {
                return {
                    status: 'confirmed',
                    tx_hash: deposit.tx_hash,
                    amount: deposit.amount,
                    amountFormatted: formatUnits(deposit.amount, this.decimals),
                    asset: deposit.asset,
                };
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // 3) nothing yet: tell the client to ask again with the same starting point
        return { status: 'pending', since: since.toISOString() };
    }
}