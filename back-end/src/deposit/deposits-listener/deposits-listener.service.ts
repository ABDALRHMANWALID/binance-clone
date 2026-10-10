// deposits-listener.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class DepositsListenerService {
  private readonly logger = new Logger(DepositsListenerService.name);
  private running = false;

  constructor(/* blockchain service, repos, config */) {}

  @Interval(15_000) // every 15 seconds
  async poll() {
    if (this.running) return;      // previous run still in progress, skip this tick
    this.running = true;
    try {
      await this.scan();
    } catch (err) {
      this.logger.error('scan failed', err as Error);
    } finally {
      this.running = false;
    }
  }

  private async scan() {
    // put the code you pasted here (getBlockNumber, getLogs, the loop, save last block)
  }
}