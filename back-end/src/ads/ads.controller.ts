import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-guard.guard.js';
import { AuthUser, CurrentUser } from '../auth/current-user/current-user.decorator.js'; // AuthUser.id لازم يبقى string
import { AdsService } from './ads.service.js';
import { CreateAdDto, ListAdsQueryDto, UpdateAdDto } from './ads.dto.js';

@Controller('ads')
export class AdsController {
  constructor(private ads: AdsService) {}

  // تصفح الـ marketplace (من غير login)
  @Get('sell')
  listSell(@Query() q: ListAdsQueryDto) {
    return this.ads.list('sell', q);
  }

  @Get('buy')
  listBuy(@Query() q: ListAdsQueryDto) {
    return this.ads.list('buy', q);
  }

  // إدارة إعلاناتي (لازم login)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAdDto) {
    return this.ads.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: number, @Body() dto: UpdateAdDto) {
    return this.ads.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: number) {
    return this.ads.remove(user.id, id);
  }
}
