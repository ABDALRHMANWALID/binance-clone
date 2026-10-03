import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './payment-methods.js';

@Injectable()
export class PaymentMethodsService {
    constructor(
        @InjectRepository(PaymentMethod)
        private readonly repo: Repository<PaymentMethod>,
    ) { }

    listMine(userId: string) {
        // return this.repo.find({
        //     where: { userId, isActive: true },
        //     select: { id: true, type: true, holderName: true, accountDetails: true, createdAt: true },
        //     order: { id: 'ASC' },
        // });
        return this.repo.find()
    }
}
