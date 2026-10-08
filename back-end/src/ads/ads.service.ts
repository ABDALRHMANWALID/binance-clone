import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource, EntityManager, FindOptionsWhere, In, MoreThan, MoreThanOrEqual, Not, Repository,
} from 'typeorm';
import { parseUnits } from 'viem';
import { PaymentMethod } from '../payment-methods/payment-method.entity.js';
import { Balance } from './balance.entity.js';
import { Ad } from './ads.entity.js';
import { CreateAdDto, ListAdsQueryDto, UpdateAdDto } from './ads.dto.js';

const DECIMALS = 6;
const toUnits = (v: string) => parseUnits(v, DECIMALS);

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad) private readonly ads: Repository<Ad>,
    private readonly dataSource: DataSource, 
  ) {}

  // ---------------------------------------------------------------- helpers

  private async getOwnedMethods(em: EntityManager, userId: string, ids: number[] | undefined) {
    const unique = [...new Set(ids)];
    const methods = await em.find(PaymentMethod, { where: { id: In(unique), userId, isActive: true } });
    if (methods.length !== unique.length) {
      throw new BadRequestException('One or more payment methods are invalid');
    }
    return methods;
  }

  private async assertBacked(em: EntityManager, userId: string, asset: string, total: bigint) {
    const balance = await em.findOne(Balance, { where: { userId, asset } });
    if (BigInt(balance?.available ?? '0') < total) {
      throw new BadRequestException('Insufficient balance to back this ad');
    }
  }

  private assertRanges(price: bigint, min: bigint, max: bigint, total: bigint) {
    if (price <= 0n) throw new BadRequestException('price must be greater than 0');
    if (total <= 0n) throw new BadRequestException('total must be greater than 0');
    if (min <= 0n) throw new BadRequestException('minFiat must be greater than 0');
    if (min > max) throw new BadRequestException('minFiat must be <= maxFiat');
  }

  private toOwnerResponse(ad: Ad) {
    return {
      id: ad.id,
      side: ad.side,
      asset: ad.asset,
      fiat: ad.fiat,
      price: ad.price,
      total: ad.total,
      remaining: ad.remaining,
      minFiat: ad.minFiat,
      maxFiat: ad.maxFiat,
      status: ad.status,
      createdAt: ad.createdAt,
      ...(ad.paymentMethods && { paymentMethodIds: ad.paymentMethods.map((p) => p.id) }),
    };
  }

  // ---------------------------------------------------------------- create

  async create(userId: string, dto: CreateAdDto) {
    const asset = dto.asset ?? 'USDT';
    const fiat = dto.fiat ?? 'EGP';
    const total = toUnits(dto.total);
    this.assertRanges(toUnits(dto.price), toUnits(dto.minFiat), toUnits(dto.maxFiat), total);

    return this.dataSource.transaction(async (em) => {
      const methods = await this.getOwnedMethods(em, userId, dto.paymentMethodIds);
      if (dto.side === 'sell') await this.assertBacked(em, userId, asset, total);

      const ad = await em.save(
        em.create(Ad, {
          userId,
          side: dto.side,
          asset,
          fiat,
          price: dto.price,
          total: total.toString(),
          remaining: total.toString(), 
          minFiat: dto.minFiat,
          maxFiat: dto.maxFiat,
          status: 'active',
          paymentMethods: methods, 
        }),
      );
      return this.toOwnerResponse(ad);
    });
  }

  // ---------------------------------------------------------------- update

  async update(userId: string, adId: number, dto: UpdateAdDto) {
    return this.dataSource.transaction(async (em) => {
      // قفل الصف (FOR UPDATE). من غير relations: Postgres مبيقبلش FOR UPDATE مع LEFT JOIN
      const ad = await em.findOne(Ad, {
        where: { id: adId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ad || ad.status === 'closed') throw new NotFoundException('Ad not found');

      let total = BigInt(ad.total);
      let remaining = BigInt(ad.remaining);

      if (dto.total !== undefined) {
        const newTotal = toUnits(dto.total);
        const delta = newTotal - total; // الفرق بيتطبق على المتبقي
        if (remaining + delta < 0n) {
          throw new BadRequestException('New total is lower than the amount already taken by orders');
        }
        total = newTotal;
        remaining += delta;
        if (delta > 0n && ad.side === 'sell') await this.assertBacked(em, userId, ad.asset, total);
      }

      ad.price = dto.price ?? ad.price;
      ad.minFiat = dto.minFiat ?? ad.minFiat;
      ad.maxFiat = dto.maxFiat ?? ad.maxFiat;
      ad.status = dto.status ?? ad.status;
      ad.total = total.toString();
      ad.remaining = remaining.toString();
      this.assertRanges(toUnits(ad.price), toUnits(ad.minFiat), toUnits(ad.maxFiat), total);

      if (dto.paymentMethodIds) {
        ad.paymentMethods = await this.getOwnedMethods(em, userId, dto.paymentMethodIds);
      }

      return this.toOwnerResponse(await em.save(ad));
    });
  }

  // ---------------------------------------------------------------- delete (soft)

  /** بنقفل الإعلان بدل ما نمسحه لأن orders فيه FK عليه. الـ orders المفتوحة بتكمل عادي. */
  async remove(userId: string, adId: number) {
    const res = await this.ads.update({ id: adId, userId, status: Not('closed') }, { status: 'closed' });
    if (!res.affected) throw new NotFoundException('Ad not found');
    return { id: adId, status: 'closed' };
  }

  // ---------------------------------------------------------------- list (sell / buy)

  /**
   * sell: ناس بتبيع USDT (اللي عايز يشتري بيتصفحها) → الأرخص أول.
   * buy : ناس بتشتري USDT (اللي عايز يبيع بيتصفحها) → الأعلى سعر أول.
   */
  async list(side: 'buy' | 'sell', q: ListAdsQueryDto) {
    const limit = q.limit ?? 20;
    const offset = q.offset ?? 0;

    const where: FindOptionsWhere<Ad> = {
      status: 'active',
      side,
      asset: q.asset ?? 'USDT',
      remaining: q.minRemaining ? MoreThanOrEqual(toUnits(q.minRemaining).toString()) : MoreThan('0'),
    };
    if (q.fiat) where.fiat = q.fiat;
    if (q.paymentMethod) where.paymentMethods = { type: q.paymentMethod, isActive: true };

    // الخطوة 1: نجيب الـ ids المطابقة بالترتيب والـ pagination.
    // (لو فلتر طريقة الدفع اشتغل، الـ join بيفلتر الـ paymentMethods نفسها كمان،
    //  عشان كده بنعمل خطوة تانية نجيب فيها الإعلان كامل بكل طرق دفعه.)
    const matched = await this.ads.find({
      select: { id: true, price: true },
      where,
      order: { price: side === 'sell' ? 'ASC' : 'DESC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    const ids = matched.map((a) => a.id);
    if (!ids.length) return { decimals: DECIMALS, limit, offset, items: [] };

    // الخطوة 2: البيانات الكاملة
    const full = await this.ads.find({
      where: { id: In(ids) },
      relations: { user: true, paymentMethods: true },
    });
    const byId = new Map(full.map((a) => [a.id, a]));

    const items = ids.map((id) => {
      const ad = byId.get(id)!;
      return {
        id: ad.id,
        side: ad.side,
        asset: ad.asset,
        fiat: ad.fiat,
        price: ad.price,
        total: ad.total,
        remaining: ad.remaining,
        minFiat: ad.minFiat,
        maxFiat: ad.maxFiat,
        createdAt: ad.createdAt,
        advertiser: `${ad.user.email.charAt(0)}***`, // مقنّع
        paymentMethods: [...new Set(ad.paymentMethods.filter((p) => p.isActive).map((p) => p.type))].sort(),
      };
    });
    return { decimals: DECIMALS, limit, offset, items };
  }
}
