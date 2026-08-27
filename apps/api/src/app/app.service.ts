import { randomInt } from 'node:crypto';

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaPg } from '@prisma/adapter-pg';

import { EventType } from '../prisma/client/enums';
import { PrismaClient } from '../prisma/client/client';
import type { Item } from '../prisma/client/client';

import { CreateItemInput } from './app.dto';

// Prisma 7's generated client ships no query engine, so a driver adapter is
// required. Built here as a free function because `super()` must be the first
// statement in the constructor (parameter properties => TS2376).
function createPrismaAdapter(config: ConfigService): PrismaPg {
  const user = config.getOrThrow<string>('db.user');
  const password = config.getOrThrow<string>('db.password');
  const host = config.getOrThrow<string>('db.host');
  const port = config.getOrThrow<number>('db.port');
  const name = config.getOrThrow<string>('db.name');

  const connectionString =
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(name)}?schema=public`;

  return new PrismaPg({ connectionString });
}

@Injectable()
export class AppService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @InjectQueue('items') private readonly itemsQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
    config: ConfigService,
  ) {
    super({ adapter: createPrismaAdapter(config) });
  }

  public async onModuleInit() {
    await this.$connect();
  }

  public async onModuleDestroy() {
    await this.$disconnect();
  }

  public async submitItem(input: CreateItemInput) {
    const item = await this.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          content_type: input.content_type,
          label: input.label,
          value: input.value,
          file_ref: input.file_ref,
          mime_type: input.mime_type,
          size: input.size,
        },
      });

      await tx.event.create({
        data: {
          item_id: created.id,
          type: EventType.item_submitted,
        },
      });

      return created;
    });

    await this.itemsQueue.add('process', { itemId: item.id });

    return item;
  }

  public async listItems() {
    const items = await this.item.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: { events: true },
    });

    return items.map((item) => {
      const processed = item.events.find(
        (e) => e.type === EventType.item_processed,
      );

      return {
        id: item.id,
        content_type: item.content_type,
        label: item.label,
        value: item.value,
        file_ref: item.file_ref,
        mime_type: item.mime_type,
        size: item.size,
        created_at: item.created_at,
        status: processed ? 'done' : 'pending',
        result: processed?.payload ?? null,
      };
    });
  }

  private async scoreItem(item: Item): Promise<{ score: number }> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Fold a few item fields into a stable seed so the score is influenced by
    // the item itself, with crypto-grade random jitter layered on top.
    const seed = `${item.id}:${JSON.stringify(item.value) ?? 'null'}:${item.size ?? 0}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = Math.trunc(hash * 31 + (seed.codePointAt(i) ?? 0)) % 2_147_483_647;
    }

    const itemFactor = Math.abs(hash % 1000) / 1000; // 0..1 derived from the item
    const noise = randomInt(0, 1000) / 1000; // 0..1 jitter
    const score = Math.round((itemFactor * 0.6 + noise * 0.4) * 100);

    return { score };
  }

  public async processItem(itemId: string) {
    const item = await this.item.findUniqueOrThrow({ where: { id: itemId } });

    const { score } = await this.scoreItem(item);

    await this.event.create({
      data: {
        item_id: item.id,
        type: EventType.item_processed,
        payload: { score },
      },
    });

    this.eventEmitter.emit('item.processed', { itemId: item.id, score });
  }
}
