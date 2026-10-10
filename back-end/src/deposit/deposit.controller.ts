import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DepositService } from './deposit.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';

@Controller('deposit')
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  // async createDeposit(
  createDeposit(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDepositDto,
  ) {
    /*
     * This should come from your JWT.
     *
     * Example:
     * req.user.walletAddress
     */
    // console.log('req', req);
    return this.depositService.getOrCreateDepositAddress(
      user.id,
      dto,
    );
    
    // const userAddress =
    //   req.user.walletAddress;
    // return this.depositService
    //   .getOrCreateDepositAddress(
    //     userAddress,
    //     dto,
    //   );
  }
}