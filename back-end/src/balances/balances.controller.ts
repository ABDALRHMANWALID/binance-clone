import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { BalancesService } from './balances.service.js';
import { IsString } from 'class-validator';

class myBalanceDto {
  @IsString()
  asset: string;
}

@Controller('balances')
@UseGuards(JwtAuthGuard)
export class BalancesController {
  constructor(private balancesService: BalancesService) {}
  @Get('my-balance')
  async getMyBalance(
    @CurrentUser() user: { id: string },
    @Query() asset: myBalanceDto,
  ) {
    return await this.balancesService.getMyBalance(user.id, asset.asset);
  }
}
