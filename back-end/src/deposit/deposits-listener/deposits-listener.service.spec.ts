import { Test, TestingModule } from '@nestjs/testing';
import { DepositsListenerService } from './deposits-listener.service.js';

describe('DepositsListenerService', () => {
  let service: DepositsListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DepositsListenerService],
    }).compile();

    service = module.get<DepositsListenerService>(DepositsListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
