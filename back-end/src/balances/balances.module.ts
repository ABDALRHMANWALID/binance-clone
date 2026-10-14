import { Module } from '@nestjs/common';
import { BalancesService } from './balances.service.js';
import { BalancesController } from './balances.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from '../deposit/entities/balances.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Balance])],
  providers: [BalancesService],
  controllers: [BalancesController],
})
export class BalancesModule {}
