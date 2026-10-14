import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { AdsService } from './ads.service.js';
import { CreateAdDto, ListAdsQueryDto, UpdateAdDto } from './ads.dto.js';

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  // 'sell' and 'buy' must be declared BEFORE ':id', otherwise ':id' would catch them
  @Get('sell')
  listSell(@Query() q: ListAdsQueryDto) {
    return this.ads.list('sell', q);
  }

  @Get('buy')
  listBuy(@Query() q: ListAdsQueryDto) {
    return this.ads.list('buy', q);
  }

  // used by the edit page
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findMine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ads.findMine(user.id, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAdDto) {
    return this.ads.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdDto,
  ) {
    return this.ads.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ads.remove(user.id, id);
  }
}
