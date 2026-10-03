import { Module } from '@nestjs/common';
import { AdsService } from './ads.service.js';
import { AdsController } from './ads.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from './ads.entity.js';
import { User } from '../auth/user.entity.js';
import { Balance } from './balance.entity.js';
import { PaymentMethod } from '../payment-methods/payment-method.entity.js';

@Module({
   imports: [
    AuthModule,
    TypeOrmModule.forFeature([Ad, PaymentMethod, User, Balance]),   // ← Ad لازم تكون هنا
  ],
  providers: [AdsService],
  controllers: [AdsController]
})
export class AdsModule {}
