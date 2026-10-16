import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from '../ads/ads.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { Balance } from '../deposit/entities/balances.js';
import { ChatModule } from '../chat/chat.module.js';
import { PaymentMethod } from '../payment-methods/payment-method.entity.js';
import { Order } from './order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    TypeOrmModule.forFeature([Order, Ad, Balance, PaymentMethod]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
