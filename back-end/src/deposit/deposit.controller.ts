import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DepositService } from './deposit.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { DepositsListenerService } from './deposit.listener.js';

@Controller('deposit')
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly depositListenerService: DepositsListenerService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  // async createDeposit(
  createDeposit(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositService.getOrCreateDepositAddress(
      user.id,
      dto,
    );
  }

  @Get('wait')
  @UseGuards(JwtAuthGuard)
  wait(
    @CurrentUser() user: { id: string },
    @Query('address') address: string,
    @Query('since') since?: string,

  ) {
    const sinceDate = since ? new Date(since) : new Date(); if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid since');
    }
    // req.user.id comes from your auth guard (JWT or session)
    return this.depositListenerService.waitForDeposit(user.id, address, sinceDate);
  }
}