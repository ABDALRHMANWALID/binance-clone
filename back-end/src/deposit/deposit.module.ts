import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service.js';
import { DepositController } from './deposit.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositAddress } from './entities/depositAddress.js';
import { BlockchainModule } from '../blockchain/blockchain.module.js';
import { DepositsListenerService } from './deposits-listener/deposits-listener.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DepositAddress]),
    AuthModule,BlockchainModule],
  controllers: [DepositController,], providers: [DepositService, DepositsListenerService,], exports: [DepositService,],
})
export class DepositModule { }
