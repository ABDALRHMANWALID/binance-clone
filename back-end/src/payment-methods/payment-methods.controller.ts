import { Controller, Get, UseGuards } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private service: PaymentMethodsService) {}

  /** GET /payment-methods */
  @Get()
  listMine(@CurrentUser() user: { id: string }) {
    return this.service.listMine(user.id);
  }
}