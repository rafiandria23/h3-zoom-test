import { randomInt } from 'node:crypto';

import {
  Injectable,
  Logger,
  type MessageEvent,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { Observable, Subject } from 'rxjs';

import { CommonService, SSE_EVENT_REPLAY_PAGE_SIZE } from '../common';
import { EventType } from '../../generated/prisma/enums';
import type { Event, Item, Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

import type { CreateItemInput, ListItemsQueryDto } from './item.dto';

@Injectable()
export class ItemService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ItemService.name);

  // Redis-backed notification that *some* `items` job finished, on every API
  // instance regardless of which one ran the worker.
  private itemsQueueEvents!: QueueEvents;

  // Fan-out "an item was processed" tick to every open SSE stream.
  private readonly processedTick = new Subject<void>();

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue('items') private readonly itemsQueue: Queue,
    private readonly config: ConfigService,
    private readonly commonService: CommonService,
  ) {}

  public async onModuleInit() {
    this.itemsQueueEvents = new QueueEvents('items', {
      connection: {
        host: this.config.getOrThrow<string>('redis.host'),
        port: this.config.getOrThrow<number>('redis.port'),
        db: this.config.getOrThrow<number>('redis.dbIndex'),
      },
    });

    this.itemsQueueEvents.on('completed', () => this.processedTick.next());
    this.itemsQueueEvents.on('error', (err) =>
      this.logger.error('items QueueEvents error', err),
    );

    await this.itemsQueueEvents.waitUntilReady();
  }

  public async onModuleDestroy() {
    this.processedTick.complete();
    await this.itemsQueueEvents?.close();
  }

  /** Emits once whenever any `items` job completes, on this instance. */
  public get processedEvents(): Observable<void> {
    return this.processedTick.asObservable();
  }

  public async submitItem(input: CreateItemInput) {
    const item = await this.db.$transaction(async (tx) => {
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

    return this.commonService.successTimestamp({ data: item });
  }

  public async listItems(query: ListItemsQueryDto) {
    const { page, size, sort_by, sort_direction } = query;

    const orderBy = {
      [sort_by]: sort_direction,
    } as Prisma.ItemOrderByWithRelationInput;

    const items = await this.db.item.findMany({
      where: { deleted_at: null },
      orderBy,
      include: { events: true },
      skip: (page - 1) * size,
      take: size,
    });

    const data = items.map((item) => {
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

    return this.commonService.successTimestamp({
      metadata: {
        pagination: { page, size, total: data.length },
        sort: { by: sort_by, direction: sort_direction },
      },
      data,
    });
  }

  /**
   * Replays the persisted event log past `cursor` (a `Last-Event-ID` = `seq`),
   * oldest first, paging until drained. `null` replays from the beginning.
   */
  public async *iterateEventsSince(
    cursor: bigint | null,
  ): AsyncGenerator<{ seq: bigint; message: MessageEvent }> {
    let current = cursor;

    for (;;) {
      const batch = await this.db.event.findMany({
        where: current === null ? undefined : { seq: { gt: current } },
        orderBy: { seq: 'asc' },
        take: SSE_EVENT_REPLAY_PAGE_SIZE,
      });

      for (const event of batch) {
        current = event.seq;
        yield { seq: event.seq, message: this.toMessage(event) };
      }

      if (batch.length < SSE_EVENT_REPLAY_PAGE_SIZE) {
        return;
      }
    }
  }

  private toMessage(event: Event): MessageEvent {
    return {
      id: event.seq.toString(),
      type: event.type,
      data: {
        item_id: event.item_id,
        payload: event.payload ?? null,
        created_at: event.created_at,
      },
    };
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
    const item = await this.db.item.findUniqueOrThrow({
      where: { id: itemId },
    });

    const { score } = await this.scoreItem(item);

    await this.db.event.create({
      data: {
        item_id: item.id,
        type: EventType.item_processed,
        payload: { score },
      },
    });
  }
}
