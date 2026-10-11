import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { DepositSweeperService } from './deposit-sweeper/deposit-sweeper.service.js';

@Controller('deposit')
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly depositListenerService: DepositsListenerService,
    private readonly sweeper: DepositSweeperService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  // async createDeposit(
  createDeposit(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositService.getOrCreateDepositAddress(user.id, dto);
  }

  @Get('wait')
  @UseGuards(JwtAuthGuard)
  wait(
    @CurrentUser() user: { id: string },
    @Query('address') address: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date();
    if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid since');
    }
    // req.user.id comes from your auth guard (JWT or session)
    return this.depositService.waitForDeposit(user.id, address, sinceDate);
  }

  @Post('sweep')
  async sweepNow() {
    // development only: remove this endpoint before going live
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException();
    await this.sweeper.run();
    return { ok: true };
  }
}
