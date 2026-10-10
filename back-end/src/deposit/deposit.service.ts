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
    // private readonly publicClient;

    // private readonly walletClient;

    // private readonly operator;

    // private readonly depositManagerAddress;

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
        // const privateKey =
        //     process.env.OPERATOR_PRIVATE_KEY;

        // const managerAddress =
        //     process.env.DEPOSIT_MANAGER_ADDRESS;

        // if (!privateKey) {
        //     throw new Error(
        //         'OPERATOR_PRIVATE_KEY is not configured',
        //     );
        // }

        // if (!managerAddress) {
        //     throw new Error(
        //         'DEPOSIT_MANAGER_ADDRESS is not configured',
        //     );
        // }

        // this.operator = privateKeyToAccount(
        //     privateKey as `0x${string}`,
        // );

        // this.publicClient = createPublicClient({
        //     chain: sepolia,
        //     transport: http(
        //         process.env.SEPOLIA_RPC_URL,
        //     ),
        // });

        // this.walletClient = createWalletClient({
        //     account: this.operator,
        //     chain: sepolia,
        //     transport: http(
        //         process.env.SEPOLIA_RPC_URL,
        //     ),
        // });

        // this.depositManagerAddress =
        //     managerAddress as `0x${string}`;
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
        return this.depositAddressRepository.save({ user_id, chain_id: 11155111, address,asset: dto.asset });

    }





    //     async getOrCreateDepositAddress(
    //         userAddress: `0x${string}`,
    //         dto: CreateDepositDto,
    //     ) {
    //         if (dto.network !== 'Sepolia') {
    //             throw new BadRequestException(
    //                 'Unsupported network',
    //             );
    //         }

    //         const assetAddress =
    //             this.assetAddresses[dto.asset]?.[
    //             dto.network
    //             ];

    //         if (!assetAddress) {
    //             throw new BadRequestException(
    //                 'Unsupported asset',
    //             );
    //         }

    //         /*
    //          * Check if the user already has
    //          * a deposit vault.
    //          */
    //         console.log('========== DEPOSIT DEBUG ==========');
    // console.log('userAddress:', userAddress);
    // console.log('assetAddress:', assetAddress);
    // console.log(
    //   'depositManagerAddress:',
    //   this.depositManagerAddress,
    // );
    // console.log('dto:', dto);
    // console.log('===================================');
    //         const existingVault =
    //             await this.publicClient.readContract({
    //                 address: this.depositManagerAddress,
    //                 abi: depositManagerAbi,
    //                 functionName: 'getDepositVault',
    //                 args: [
    //                     userAddress,
    //                     assetAddress,
    //                 ],
    //             });

    //         if (
    //             existingVault !==
    //             '0x0000000000000000000000000000000000000000'
    //         ) {
    //             return {
    //                 depositAddress: existingVault,
    //                 asset: dto.asset,
    //                 network: dto.network,
    //             };
    //         }

    //         /*
    //          * Create a new vault.
    //          */
    //         try {
    //             const hash =
    //                 await this.walletClient.writeContract({
    //                     address: this.depositManagerAddress,
    //                     abi: depositManagerAbi,
    //                     functionName: 'createDepositVault',
    //                     args: [
    //                         userAddress,
    //                         assetAddress,
    //                     ],
    //                 });

    //             await this.publicClient.waitForTransactionReceipt({
    //                 hash,
    //             });

    //             const vault =
    //                 await this.publicClient.readContract({
    //                     address: this.depositManagerAddress,
    //                     abi: depositManagerAbi,
    //                     functionName: 'getDepositVault',
    //                     args: [
    //                         userAddress,
    //                         assetAddress,
    //                     ],
    //                 });

    //             if (
    //                 vault ===
    //                 '0x0000000000000000000000000000000000000000'
    //             ) {
    //                 throw new Error(
    //                     'Deposit vault was not created',
    //                 );
    //             }

    //             return {
    //                 depositAddress: vault,
    //                 asset: dto.asset,
    //                 network: dto.network,
    //                 transactionHash: hash,
    //             };
    //         } catch (error) {
    //             console.error(
    //                 'Failed to create deposit vault:',
    //                 error,
    //             );

    //             throw new InternalServerErrorException(
    //                 'Failed to create deposit address',
    //             );
    //         }
    //     }
}