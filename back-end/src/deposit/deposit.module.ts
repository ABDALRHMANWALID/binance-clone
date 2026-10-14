import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service.js';
import { DepositController } from './deposit.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositAddress } from './entities/depositAddress.js';
import { BlockchainModule } from '../blockchain/blockchain.module.js';
import { DepositsListenerService } from './deposit.listener.js';
import { Deposit } from './entities/deposit.js';
import { ChainCursor } from './entities/chain_cursors.js';
import { Balance } from './entities/balances.js';
import { DepositSweeperService } from './deposit-sweeper/deposit-sweeper.service.js';
import { Sweep } from './entities/sweep.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DepositAddress,
      Deposit,
      ChainCursor,
      Balance,
      Sweep,
    ]),
    AuthModule,
    BlockchainModule,
  ],
  controllers: [DepositController],
  providers: [DepositService, DepositsListenerService, DepositSweeperService],
  exports: [DepositService],
})
export class DepositModule {}
