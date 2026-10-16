import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { User } from '../../auth/user.entity.js';
import { Order } from '../../orders/order.entity.js';
import { clean } from '../../balances/balance-ops.js';
import { OPEN_ORDER_STATUSES } from '../chat.constants.js';
import { ChatConversation } from '../entities/chat-conversation.entity.js';
import { ChatParticipantRead } from '../entities/chat-participant-read.entity.js';
import { ChatReadStatusService } from './chat-read-status.service.js';

export interface ConversationAccess {
  conversation: ChatConversation;
  order: Order;
  role: 'buyer' | 'seller';
  counterpartId: string;
}

@Injectable()
export class ChatConversationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly readStatus: ChatReadStatusService,
  ) {}

  // ---------------------------------------------------------------- create / access

  /** called when an order is created; pass the same EntityManager to stay in its transaction */
  async getOrCreateConversation(orderId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    const existing = await manager.findOne(ChatConversation, {
      where: { orderId },
    });
    if (existing) return existing;

    const order = await manager.findOne(Order, { where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const conversation = await manager.save(
      manager.create(ChatConversation, { orderId }),
    );

    // one read cursor per participant (it is also what says who belongs here)
    await manager.insert(ChatParticipantRead, [
      { conversationId: conversation.id, userId: order.buyerId },
      { conversationId: conversation.id, userId: order.sellerId },
    ]);

    return conversation;
  }

  /** only the buyer and the seller of the order can touch the conversation */
  async validateConversationAccess(
    conversationId: string,
    userId: string,
    em?: EntityManager,
  ): Promise<ConversationAccess> {
    const manager = em ?? this.dataSource.manager;

    const conversation = await manager.findOne(ChatConversation, {
      where: { id: conversationId },
      relations: { order: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const order = conversation.order;
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const isBuyer = order.buyerId === userId;
    return {
      conversation,
      order,
      role: isBuyer ? 'buyer' : 'seller',
      counterpartId: isBuyer ? order.sellerId : order.buyerId,
    };
  }

  /** new messages are accepted only while the order is still open */
  assertOpen(order: Order) {
    if (!OPEN_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `This conversation is closed (order is ${order.status})`,
      );
    }
  }

  async getConversationParticipants(conversationId: string) {
    const conversation = await this.dataSource.manager.findOne(
      ChatConversation,
      { where: { id: conversationId }, relations: { order: true } },
    );
    if (!conversation) throw new NotFoundException('Conversation not found');
    return {
      buyerId: conversation.order.buyerId,
      sellerId: conversation.order.sellerId,
    };
  }

  async getConversationIdByOrder(orderId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const conversation = await manager.findOne(ChatConversation, {
      where: { orderId },
    });
    return conversation?.id ?? null;
  }

  async getConversationIdsByOrders(orderIds: string[]) {
    if (!orderIds.length) return new Map<string, string>();
    const rows = await this.dataSource.manager.find(ChatConversation, {
      where: { orderId: In(orderIds) },
    });
    return new Map(rows.map((c) => [c.orderId, c.id]));
  }

  // ---------------------------------------------------------------- read

  async getConversationById(userId: string, conversationId: string) {
    const { conversation, order, role, counterpartId } =
      await this.validateConversationAccess(conversationId, userId);

    const unreadCount = await this.readStatus.getConversationUnreadCount(
      userId,
      conversationId,
    );

    return {
      id: conversation.id,
      orderId: order.id,
      role,
      counterpart: await this.maskedName(counterpartId),
      unreadCount,
      order: this.orderSummary(order),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /** my conversations, most recent activity first, with the last message and the unread count */
  async getUserConversations(
    userId: string,
    pagination: { limit?: number; offset?: number },
  ) {
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;

    const conversations = await this.dataSource
      .getRepository(ChatConversation)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.order', 'o')
      .where('o.buyerId = :userId OR o.sellerId = :userId', { userId })
      .orderBy('c.updatedAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();

    if (!conversations.length) return { items: [] };

    const ids = conversations.map((c) => c.id);

    // the newest message of each conversation, in one query
    const lastRows: {
      id: string;
      conversationId: string;
      senderId: string;
      type: string;
      content: string | null;
      createdAt: Date;
    }[] = await this.dataSource.query(
      `SELECT DISTINCT ON (m.conversation_id)
              m.id, m.conversation_id AS "conversationId", m.sender_id AS "senderId",
              m.type, m.content, m.created_at AS "createdAt"
       FROM chat_messages m
       WHERE m.conversation_id = ANY($1::uuid[]) AND m.deleted_at IS NULL
       ORDER BY m.conversation_id, m.id DESC`,
      [ids],
    );
    const lastByConversation = new Map(lastRows.map((r) => [r.conversationId, r]));

    const unread = await this.readStatus.getUnreadCountsByConversation(
      userId,
      ids,
    );

    const counterpartIds = conversations.map((c) =>
      c.order.buyerId === userId ? c.order.sellerId : c.order.buyerId,
    );
    const names = await this.maskedNames(counterpartIds);

    return {
      items: conversations.map((c, i) => {
        const last = lastByConversation.get(c.id);
        return {
          id: c.id,
          orderId: c.order.id,
          role: c.order.buyerId === userId ? 'buyer' : 'seller',
          counterpart: names.get(counterpartIds[i]) ?? 'user',
          order: this.orderSummary(c.order),
          lastMessage: last
            ? {
                id: last.id,
                senderId: last.senderId,
                type: last.type,
                content: last.content,
                createdAt: last.createdAt,
              }
            : null,
          unreadCount: unread.get(c.id) ?? 0,
          updatedAt: c.updatedAt,
        };
      }),
    };
  }

  // ---------------------------------------------------------------- helpers

  private orderSummary(order: Order) {
    return {
      id: order.id,
      status: order.status,
      asset: order.asset,
      fiat: order.fiat,
      amount: clean(order.amount),
      price: clean(order.price),
      fiatAmount: order.fiatAmount,
      expiresAt: order.expiresAt,
    };
  }

  // the other side is shown masked, like in the ads list ("a***")
  private async maskedNames(userIds: string[]) {
    const unique = [...new Set(userIds)];
    const users = await this.dataSource.getRepository(User).find({
      where: { id: In(unique) },
      select: { id: true, email: true },
    });
    return new Map(users.map((u) => [u.id, `${u.email.charAt(0)}***`]));
  }

  private async maskedName(userId: string) {
    const names = await this.maskedNames([userId]);
    return names.get(userId) ?? 'user';
  }
}
