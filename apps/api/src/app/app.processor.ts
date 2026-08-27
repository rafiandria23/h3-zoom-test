import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AppService } from './app.service';

@Processor('items')
export class ItemsProcessor extends WorkerHost {
  constructor(private readonly appService: AppService) {
    super();
  }

  override async process(job: Job<{ itemId: string }>) {
    return this.appService.processItem(job.data.itemId);
  }
}
