import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { formatUnits, parseUnits } from 'viem';
import { PaymentMethod } from '../payment-methods/payment-method.entity.js';
import { Balance } from '../deposit/entities/balances.js';
import { Ad, AdSide } from './ads.entity.js';
import { CreateAdDto, ListAdsQueryDto, UpdateAdDto } from './ads.dto.js';

const DECIMALS = 18;
const DEFAULT_ASSET = 'ETH';
const DEFAULT_FIAT = 'EGP';

// All money math is done with bigint, never with Number (0.1 + 0.2 is not 0.3)
const toUnits = (v: string) => parseUnits(v, DECIMALS);
const fromUnits = (v: bigint) => formatUnits(v, DECIMALS);
// "0.500000000000000000" -> "0.5"
const clean = (v: string) => fromUnits(toUnits(v));

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad) private readonly ads: Repository<Ad>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------- helpers

  private async getActiveMethods(em: EntityManager, ids: number[]) {
    const unique = [...new Set(ids)];
    const methods = await em.find(PaymentMethod, {
      where: { id: In(unique), is_active: true },
    });
    if (methods.length !== unique.length) {
      throw new BadRequestException('One or more payment methods are invalid');
    }
    return methods;
  }

  private assertRanges(
    price: string,
    minFiat: string,
    maxFiat: string,
    total: string,
  ) {
    if (toUnits(price) <= 0n) {
      throw new BadRequestException('price must be greater than 0');
    }
    if (toUnits(total) <= 0n) {
      throw new BadRequestException('total must be greater than 0');
    }
    if (toUnits(minFiat) <= 0n) {
      throw new BadRequestException('minFiat must be greater than 0');
    }
    if (toUnits(minFiat) > toUnits(maxFiat)) {
      throw new BadRequestException('minFiat must be <= maxFiat');
    }
  }

  /**
   * available -> locked, in ONE atomic statement.
   * The "available >= amount" condition is part of the UPDATE itself, so two
   * requests at the same time can never spend the same balance twice.
   */
  private async lockFunds(
    em: EntityManager,
    userId: string,
    asset: string,
    amount: bigint,
  ) {
    const result = await em
      .createQueryBuilder()
      .update(Balance)
      .set({
        available: () => 'available - CAST(:amount AS numeric)',
        locked: () => 'locked + CAST(:amount AS numeric)',
      })
      .where(
        'user_id = :userId AND asset = :asset AND available >= CAST(:amount AS numeric)',
        { userId, asset, amount: fromUnits(amount) },
      )
      .execute();

    if (!result.affected) {
      const balance = await em.findOne(Balance, {
        where: { user_id: userId, asset },
      });
      const available = balance ? clean(balance.available) : '0';
      throw new BadRequestException(
        `Insufficient ${asset} balance. Available: ${available}`,
      );
    }
  }

  /** locked -> available, also atomic */
  private async unlockFunds(
    em: EntityManager,
    userId: string,
    asset: string,
    amount: bigint,
  ) {
    const result = await em
      .createQueryBuilder()
      .update(Balance)
      .set({
        locked: () => 'locked - CAST(:amount AS numeric)',
        available: () => 'available + CAST(:amount AS numeric)',
      })
      .where(
        'user_id = :userId AND asset = :asset AND locked >= CAST(:amount AS numeric)',
        { userId, asset, amount: fromUnits(amount) },
      )
      .execute();

    if (!result.affected) {
      throw new ConflictException(
        'Locked balance does not match this ad, please contact support',
      );
    }
  }

  private toOwnerResponse(ad: Ad) {
    return {
      id: ad.id,
      side: ad.side,
      asset: ad.asset,
      fiat: ad.fiat,
      price: clean(ad.price),
      total: clean(ad.total),
      remaining: clean(ad.remaining),
      minFiat: clean(ad.minFiat),
      maxFiat: clean(ad.maxFiat),
      status: ad.status,
      createdAt: ad.createdAt,
      ...(ad.paymentMethods && {
        paymentMethodIds: ad.paymentMethods.map((p) => p.id),
      }),
    };
  }

  // ----------------------------------------------------------------- create

  /** works for both sell and buy ads */
  async create(userId: string, dto: CreateAdDto) {
    const asset = dto.asset ?? DEFAULT_ASSET;
    const fiat = dto.fiat ?? DEFAULT_FIAT;

    this.assertRanges(dto.price, dto.minFiat, dto.maxFiat, dto.total);
    const total = toUnits(dto.total);

    return this.dataSource.transaction(async (em) => {
      const methods = await this.getActiveMethods(em, dto.paymentMethodIds);

      // sell: total must be <= available, then it moves from available to locked.
      // buy:  nothing to check, the ad is simply created.
      if (dto.side === 'sell') {
        await this.lockFunds(em, userId, asset, total);
      }

      const ad = await em.save(
        em.create(Ad, {
          userId,
          side: dto.side,
          asset,
          fiat,
          price: dto.price,
          total: fromUnits(total),
          remaining: fromUnits(total),
          minFiat: dto.minFiat,
          maxFiat: dto.maxFiat,
          status: 'active',
          paymentMethods: methods,
        }),
      );

      return this.toOwnerResponse(ad);
    });
  }

  // ----------------------------------------------------------------- update

  /** works for both sell and buy ads */
  async update(userId: string, adId: number, dto: UpdateAdDto) {
    return this.dataSource.transaction(async (em) => {
      // lock the ad row; no relations, because FOR UPDATE cannot be combined with LEFT JOIN
      const ad = await em.findOne(Ad, {
        where: { id: adId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ad) throw new NotFoundException('Ad not found');
      if (ad.userId !== userId) {
        throw new ForbiddenException('You can only edit your own ads');
      }
      if (ad.status === 'closed') {
        throw new BadRequestException('This ad is closed and cannot be edited');
      }

      // 1) work out the new numbers
      const oldTotal = toUnits(ad.total);
      const oldRemaining = toUnits(ad.remaining);
      let newTotal = oldTotal;
      let newRemaining = oldRemaining;

      if (dto.total !== undefined) {
        newTotal = toUnits(dto.total);
        // the difference is applied to what is still available in the ad
        newRemaining = oldRemaining + (newTotal - oldTotal);

        if (newRemaining < 0n) {
          throw new BadRequestException(
            'New total is lower than the amount already taken by orders',
          );
        }
      }

      const price = dto.price ?? ad.price;
      const minFiat = dto.minFiat ?? ad.minFiat;
      const maxFiat = dto.maxFiat ?? ad.maxFiat;
      this.assertRanges(price, minFiat, maxFiat, fromUnits(newTotal));

      // 2) sell only: move the difference between available and locked.
      //    Locking `delta` needs available >= delta, which is exactly the rule
      //    "available + old total >= new total".
      const delta = newTotal - oldTotal;
      if (ad.side === 'sell' && delta > 0n) {
        await this.lockFunds(em, userId, ad.asset, delta);
      } else if (ad.side === 'sell' && delta < 0n) {
        await this.unlockFunds(em, userId, ad.asset, -delta);
      }

      // 3) save the ad
      ad.price = price;
      ad.minFiat = minFiat;
      ad.maxFiat = maxFiat;
      ad.total = fromUnits(newTotal);
      ad.remaining = fromUnits(newRemaining);
      ad.status = dto.status ?? ad.status;

      if (dto.paymentMethodIds) {
        ad.paymentMethods = await this.getActiveMethods(
          em,
          dto.paymentMethodIds,
        );
      }

      return this.toOwnerResponse(await em.save(ad));
    });
  }

  // ----------------------------------------------------------------- delete

  async remove(userId: string, adId: number) {
    try {
      return await this.dataSource.transaction(async (em) => {
        const ad = await em.findOne(Ad, {
          where: { id: adId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!ad) throw new NotFoundException('Ad not found');
        if (ad.userId !== userId) {
          throw new ForbiddenException('You can only delete your own ads');
        }

        // keep what we need first, TypeORM clears the entity id after remove()
        const { id, side, asset, remaining } = ad;

        await em.remove(ad);

        // sell: the part that was never sold goes back from locked to available
        if (side === 'sell') {
          const amount = toUnits(remaining);
          if (amount > 0n) await this.unlockFunds(em, userId, asset, amount);
        }

        return { id, deleted: true };
      });
    } catch (err: any) {
      // 23503 = foreign key violation: the ad is referenced by orders
      if (err?.code === '23503') {
        throw new ConflictException('This ad has orders and cannot be deleted');
      }
      throw err;
    }
  }

  // ------------------------------------------------------------------- list

  /**
   * sell: people selling, the buyer browses  -> cheapest first
   * buy:  people buying, the seller browses  -> highest price first
   */
  async list(side: AdSide, q: ListAdsQueryDto) {
    const asset = q.asset ?? DEFAULT_ASSET;

    const qb = this.ads
      .createQueryBuilder('ad')
      // only the columns we need from the advertiser, not the whole user row
      .leftJoin('ad.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .leftJoinAndSelect('ad.paymentMethods', 'pm', 'pm.is_active = true')
      .where('ad.status = :status', { status: 'active' })
      .andWhere('ad.side = :side', { side })
      .andWhere('ad.asset = :asset', { asset });

    if (q.minRemaining) {
      qb.andWhere('ad.remaining >= :minRemaining', {
        minRemaining: q.minRemaining,
      });
    } else {
      qb.andWhere('ad.remaining > 0');
    }

    // EXISTS instead of a join filter, so each ad still returns ALL its payment methods
    if (q.paymentMethod) {
      qb.andWhere(
        `EXISTS (
           SELECT 1
           FROM ad_payment_methods apm
           JOIN payment_methods pmf ON pmf.id = apm.payment_method_id
           WHERE apm.ad_id = ad.id
             AND pmf.name = :paymentMethod
             AND pmf.is_active = true
         )`,
        { paymentMethod: q.paymentMethod },
      );
    }

    qb.orderBy('ad.price', side === 'sell' ? 'ASC' : 'DESC').addOrderBy(
      'ad.id',
      'ASC',
    );

    const ads = await qb.getMany();

    return {
      items: ads.map((ad) => ({
        id: ad.id,
        side: ad.side,
        asset: ad.asset,
        fiat: ad.fiat,
        price: clean(ad.price),
        total: clean(ad.total),
        remaining: clean(ad.remaining),
        minFiat: clean(ad.minFiat),
        maxFiat: clean(ad.maxFiat),
        createdAt: ad.createdAt,
        advertiser: `${ad.user.email.charAt(0)}***`, // masked
        paymentMethods: ad.paymentMethods.map((p) => p.name).sort(),
      })),
    };
  }

  // ------------------------------------------- extra: one ad, for the edit page

  async findMine(userId: string, adId: number) {
    const ad = await this.ads.findOne({
      where: { id: adId },
      relations: { paymentMethods: true },
    });
    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only view your own ads here');
    }
    return this.toOwnerResponse(ad);
  }
}
