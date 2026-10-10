// src/blockchain/blockchain.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider } from 'ethers';
import { FACTORY_ABI } from './abi/factory.abi.js';

@Injectable()
export class BlockchainService {
  readonly provider: JsonRpcProvider;
  readonly factory: Contract;

  constructor(config: ConfigService) {
    this.provider = new JsonRpcProvider(config.getOrThrow('SEPOLIA_RPC'));
    this.factory = new Contract(
      config.getOrThrow('FACTORY_ADDRESS'),
      FACTORY_ABI,
      this.provider,
    );
  }
}