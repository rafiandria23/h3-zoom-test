import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { ItemService } from './item.service';

@Processor('items')
export class ItemsProcessor extends WorkerHost {
  constructor(private readonly itemService: ItemService) {
    super();
  }

  override async process(job: Job<{ itemId: string }>) {
    return this.itemService.processItem(job.data.itemId);
  }
}
