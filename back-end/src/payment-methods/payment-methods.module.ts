import { Module } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service.js';
import { PaymentMethodsController } from './payment-methods.controller.js';
import { PaymentMethod } from './payment-method.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod]), AuthModule],
  providers: [PaymentMethodsService],
  controllers: [PaymentMethodsController],
})
export class PaymentMethodsModule {}
