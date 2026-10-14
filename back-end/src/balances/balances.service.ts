import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Balance } from '../deposit/entities/balances.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(Balance)
    private readonly balancesRepository: Repository<Balance>,
  ) {}
  async getMyBalance(user_id: string, asset: string) {
    console.log({ user_id, asset });

    const balance = await this.balancesRepository.findOne({
      where: { user_id, asset },
    });
    if (!balance) {
      throw new Error(`you don't have any ${asset}`);
    }
    return balance;
  }
}
