import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

import {
    createPublicClient,
    createWalletClient,
    http,
} from 'viem';

import {
    privateKeyToAccount,
} from 'viem/accounts';

import {
    sepolia,
} from 'viem/chains';

import { CreateDepositDto } from './dto/create-deposit.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositAddress } from './entities/depositAddress.js';
import { Contract } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service.js';
import { uuidToUint } from '../blockchain/utilies/uuid.util.js';

@Injectable()
export class DepositService {

    private readonly assetAddresses: Record<
        string,
        Record<string, `0x${string}`>
    > = {
            USDT: {
                Sepolia:
                    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            },
        };

    constructor(private readonly blockchain: BlockchainService,
        @InjectRepository(DepositAddress) private readonly depositAddressRepository: Repository<DepositAddress>,) {
    }

    async getOrCreateDepositAddress(
        user_id: string,
        dto: CreateDepositDto,
    ) {
        const depositAddress = await this.depositAddressRepository.findOne({
            where: { user_id, asset: dto.asset, chain_id: 11155111 },
        });

        if (depositAddress) return depositAddress;
        const address: string = await this.blockchain.factory.predict(uuidToUint(user_id));
        return this.depositAddressRepository.save({ user_id, chain_id: 11155111, address, asset: dto.asset });

    }
}