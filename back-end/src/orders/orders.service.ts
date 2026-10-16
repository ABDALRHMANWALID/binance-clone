import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { DataSource, EntityManager, LessThan } from 'typeorm';
import { Ad } from '../ads/ads.entity.js';
import {
  ONE,
  clean,
  fromUnits,
  lockFunds,
  settleTrade,
  toUnits,
  unlockFunds,
} from '../balances/balance-ops.js';
import { CHAT_EVENTS } from '../chat/chat.constants.js';
import { ChatConversationsService } from '../chat/services/chat-conversations.service.js';
import { ChatEventsService } from '../chat/services/chat-events.service.js';
import { ChatMessagesService } from '../chat/services/chat-messages.service.js';
import { CreateOrderDto, PayOrderDto } from './orders.dto.js';
import { Order } from './order.entity.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly paymentWindowMs: number;
  private expiring = false;

  constructor(
    config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly conversations: ChatConversationsService,
    private readonly messages: ChatMessagesService,
    private readonly events: ChatEventsService,
  ) {
    this.paymentWindowMs =
      Number(config.get('ORDER_PAYMENT_WINDOW_MINUTES') ?? 15) * 60_000;
  }

  // ================================================================ start (POST /ads/:adId/orders)

  /**
   * The user picks an amount from an ad. This creates the order and its conversation.
   *
   *   sell ad -> the advertiser is the seller (his funds are already locked by the ad),
   *              the user is the buyer
   *   buy ad  -> the advertiser is the buyer,
   *              the user is the seller, so HIS funds are locked now (available -> locked)
   */
  async createFromAd(takerId: string, adId: number, dto: CreateOrderDto) {
    const amount = toUnits(dto.amount);
    if (amount <= 0n) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const { order, conversationId, advertiserId } =
      await this.dataSource.transaction(async (em) => {
        // lock the ad row, so two orders cannot take the same remaining amount
        const ad = await em.findOne(Ad, {
          where: { id: adId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!ad) throw new NotFoundException('Ad not found');
        if (ad.status !== 'active') {
          throw new BadRequestException('This ad is not active');
        }
        if (ad.userId === takerId) {
          throw new BadRequestException('You cannot trade with your own ad');
        }

        const remaining = toUnits(ad.remaining);
        if (amount > remaining) {
          throw new BadRequestException(
            `Only ${clean(ad.remaining)} ${ad.asset} is left in this ad`,
          );
        }

        // what the buyer pays, and the limits of the ad
        const fiatExact = (amount * toUnits(ad.price)) / ONE;
        if (
          fiatExact < toUnits(ad.minFiat) ||
          fiatExact > toUnits(ad.maxFiat)
        ) {
          throw new BadRequestException(
            `Order value must be between ${clean(ad.minFiat)} and ${clean(ad.maxFiat)} ${ad.fiat}`,
          );
        }
        const fiatAmount = this.roundFiat(fiatExact);

        // the payment method must belong to the ad (and be active)
        const method = await em.query(
          `SELECT 1
           FROM ad_payment_methods apm
           JOIN payment_methods pm ON pm.id = apm.payment_method_id
           WHERE apm.ad_id = $1 AND apm.payment_method_id = $2 AND pm.is_active = true`,
          [adId, dto.paymentMethodId],
        );
        if (!method.length) {
          throw new BadRequestException('Payment method is not available for this ad');
        }

        const [buyerId, sellerId] =
          ad.side === 'sell' ? [takerId, ad.userId] : [ad.userId, takerId];

        // buy ad: the user sells, so his crypto is reserved for this order now
        if (ad.side === 'buy') {
          await lockFunds(em, takerId, ad.asset, amount);
        }

        // take the amount from the ad
        await em.update(Ad, { id: ad.id }, { remaining: fromUnits(remaining - amount) });

        const order = await em.save(
          em.create(Order, {
            adId: ad.id,
            buyerId,
            sellerId,
            paymentMethodId: dto.paymentMethodId,
            asset: ad.asset,
            fiat: ad.fiat,
            amount: fromUnits(amount),
            price: ad.price,
            fiatAmount,
            status: 'pending_payment',
            expiresAt: new Date(Date.now() + this.paymentWindowMs),
          }),
        );

        const conversation = await this.conversations.getOrCreateConversation(
          order.id,
          em,
        );

        return { order, conversationId: conversation.id, advertiserId: ad.userId };
      });

    // the advertiser is told after the commit
    this.events.emitToUser(advertiserId, CHAT_EVENTS.CONVERSATION_CREATED, {
      conversationId,
      orderId: order.id,
    });

    return this.toView(order, takerId, conversationId);
  }

  // ================================================================ buyer: "I paid" + proof

  /**
   * The buyer sends the transfer proof (an image or a PDF uploaded to the chat first).
   * The proof message and the status change happen in ONE transaction.
   */
  async markPaid(userId: string, orderId: string, dto: PayOrderDto) {
    const result = await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, orderId);

      if (order.buyerId !== userId) {
        throw new ForbiddenException('Only the buyer can mark the order as paid');
      }
      if (order.status !== 'pending_payment') {
        throw new BadRequestException(`Order is ${order.status}`);
      }
      if (order.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('The payment window has expired');
      }

      const conversation = await this.conversations.getOrCreateConversation(
        order.id,
        em,
      );

      // the proof is a normal chat message with the attachment, so the seller sees it in the chat
      const created = await this.messages.createInTransaction(
        em,
        userId,
        conversation.id,
        {
          content: dto.note,
          attachmentIds: dto.uploadIds,
          clientMessageId: dto.clientMessageId,
        },
      );

      order.status = 'paid';
      order.paidAt = new Date();
      order.paymentProofMessageId = created.message.id;
      await em.save(order);

      return { order, created, conversationId: conversation.id };
    });

    await this.messages.publish(result.created.message, result.created.recipientId);
    this.emitOrderUpdated(result.order, result.conversationId);

    return this.toView(result.order, userId, result.conversationId);
  }

  // ================================================================ seller: confirm

  /** The seller saw the money arrive: the crypto is released to the buyer. */
  async confirm(userId: string, orderId: string) {
    const order = await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, orderId);

      if (order.sellerId !== userId) {
        throw new ForbiddenException('Only the seller can confirm the payment');
      }
      if (order.status !== 'paid') {
        throw new BadRequestException(
          order.status === 'pending_payment'
            ? 'The buyer has not sent the payment proof yet'
            : `Order is ${order.status}`,
        );
      }

      // seller: locked -> buyer: available
      await settleTrade(
        em,
        order.sellerId,
        order.buyerId,
        order.asset,
        toUnits(order.amount),
      );

      order.status = 'completed';
      order.completedAt = new Date();
      await em.save(order);
      return order;
    });

    await this.emitOrderUpdatedByOrder(order);
    return this.toView(order, userId, await this.conversations.getConversationIdByOrder(order.id));
  }

  // ================================================================ cancel / expire

  /** The buyer gives up before paying. */
  async cancel(userId: string, orderId: string) {
    const order = await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, orderId);

      if (order.buyerId !== userId) {
        throw new ForbiddenException('Only the buyer can cancel the order');
      }
      if (order.status !== 'pending_payment') {
        throw new BadRequestException(`Order is ${order.status} and cannot be cancelled`);
      }

      await this.cancelInTransaction(em, order);
      return order;
    });

    await this.emitOrderUpdatedByOrder(order);
    return this.toView(order, userId, await this.conversations.getConversationIdByOrder(order.id));
  }

  /** orders nobody paid in time are cancelled, so the reserved amounts are never stuck */
  @Interval(60_000)
  async expireOverdueOrders() {
    if (this.expiring) return;
    this.expiring = true;

    try {
      const overdue = await this.dataSource.getRepository(Order).find({
        where: { status: 'pending_payment', expiresAt: LessThan(new Date()) },
        take: 50,
      });

      for (const candidate of overdue) {
        try {
          const order = await this.dataSource.transaction(async (em) => {
            const order = await this.lockOrder(em, candidate.id);
            // it may have been paid or cancelled while we were waiting for the lock
            if (order.status !== 'pending_payment' || order.expiresAt.getTime() > Date.now()) {
              return null;
            }
            await this.cancelInTransaction(em, order);
            return order;
          });
          if (order) await this.emitOrderUpdatedByOrder(order);
        } catch (err) {
          this.logger.error(`could not expire order ${candidate.id}: ${(err as Error).message}`);
        }
      }
    } finally {
      this.expiring = false;
    }
  }

  // ================================================================ read

  async getOrder(userId: string, orderId: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertParticipant(order, userId);

    return this.toView(order, userId, await this.conversations.getConversationIdByOrder(order.id));
  }

  async listMyOrders(userId: string, status?: Order['status']) {
    const qb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('o')
      .where('(o.buyerId = :userId OR o.sellerId = :userId)', { userId });

    if (status) qb.andWhere('o.status = :status', { status });

    const orders = await qb.orderBy('o.createdAt', 'DESC').take(50).getMany();
    const conversationIds = await this.conversations.getConversationIdsByOrders(
      orders.map((o) => o.id),
    );

    return {
      items: orders.map((o) => this.toView(o, userId, conversationIds.get(o.id))),
    };
  }

  // ================================================================ helpers

  private async lockOrder(em: EntityManager, orderId: string) {
    const order = await em.findOne(Order, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private assertParticipant(order: Order, userId: string) {
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('This order is not yours');
    }
  }

  /**
   * Gives the reserved amount back.
   * Lock order is always: order -> ad -> balances, the same as everywhere else.
   */
  private async cancelInTransaction(em: EntityManager, order: Order) {
    const amount = toUnits(order.amount);

    const ad = await em.findOne(Ad, {
      where: { id: order.adId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ad) throw new ConflictException('The ad of this order no longer exists');

    // the amount goes back to the ad
    await em.update(Ad, { id: ad.id }, { remaining: fromUnits(toUnits(ad.remaining) + amount) });

    // buy ad: the seller (the user who took the ad) gets his reserved crypto back.
    // sell ad: the crypto simply stays locked inside the ad.
    if (ad.side === 'buy') {
      await unlockFunds(em, order.sellerId, order.asset, amount);
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await em.save(order);
  }

  // half up to 2 decimals, from a value with 18 decimals
  private roundFiat(exact: bigint) {
    const cents = (exact + BigInt(5) * BigInt(10) ** BigInt(15)) / BigInt(10) ** BigInt(16);
    const whole = cents / BigInt(100);
    const fraction = (cents % BigInt(100)).toString().padStart(2, '0');
    return `${whole}.${fraction}`;
  }

  private async emitOrderUpdatedByOrder(order: Order) {
    const conversationId = await this.conversations.getConversationIdByOrder(order.id);
    this.emitOrderUpdated(order, conversationId);
  }

  // both users get it on their personal room, so it works even if they did not join the conversation
  private emitOrderUpdated(order: Order, conversationId: string | null) {
    const payload = { orderId: order.id, conversationId, status: order.status };
    this.events.emitToUser(order.buyerId, CHAT_EVENTS.ORDER_UPDATED, payload);
    this.events.emitToUser(order.sellerId, CHAT_EVENTS.ORDER_UPDATED, payload);
  }

  private toView(order: Order, userId: string, conversationId?: string | null) {
    return {
      id: order.id,
      adId: order.adId,
      conversationId: conversationId ?? null,
      role: order.buyerId === userId ? 'buyer' : 'seller',
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      paymentMethodId: order.paymentMethodId,
      asset: order.asset,
      fiat: order.fiat,
      amount: clean(order.amount),
      price: clean(order.price),
      fiatAmount: order.fiatAmount,
      status: order.status,
      paymentProofMessageId: order.paymentProofMessageId,
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
    };
  }
}
