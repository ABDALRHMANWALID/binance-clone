import { Test, TestingModule } from '@nestjs/testing';
import { DepositSweeperService } from './deposit-sweeper.service.js';

describe('DepositSweeperService', () => {
  let service: DepositSweeperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DepositSweeperService],
    }).compile();

    service = module.get<DepositSweeperService>(DepositSweeperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
