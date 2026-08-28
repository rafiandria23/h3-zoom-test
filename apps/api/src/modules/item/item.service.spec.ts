import { SSE_EVENT_REPLAY_PAGE_SIZE } from '../common';
import { EventType } from '../../generated/prisma/enums';
import type { Event } from '../../generated/prisma/client';
import type { DatabaseService } from '../database/database.service';

import { ItemService } from './item.service';

type FindManyArgs = {
  where?: { seq?: { gt: bigint } };
  orderBy?: unknown;
  take?: number;
};

function makeEvent(seq: number, over: Partial<Event> = {}): Event {
  return {
    id: `evt-${seq}`,
    seq: BigInt(seq),
    type: EventType.item_processed,
    payload: { score: seq },
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    item_id: `item-${seq}`,
    ...over,
  } as Event;
}

describe('ItemService.iterateEventsSince', () => {
  function buildService(findMany: jest.Mock) {
    const db = { event: { findMany } } as unknown as DatabaseService;
    return new ItemService(
      db,
      {} as never, // itemsQueue - unused here
      {} as never, // config - unused here
      {} as never, // commonService - unused here
    );
  }

  it('replays the whole log from the beginning as SSE messages', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        makeEvent(1, { type: EventType.item_submitted, payload: null }),
        makeEvent(2),
      ]);
    const service = buildService(findMany);

    const messages = [];
    for await (const row of service.iterateEventsSince(null)) {
      messages.push(row.message);
    }

    expect(findMany).toHaveBeenCalledTimes(1);
    expect((findMany.mock.calls[0][0] as FindManyArgs).where).toBeUndefined();
    expect(messages).toEqual([
      {
        id: '1',
        type: EventType.item_submitted,
        data: {
          item_id: 'item-1',
          payload: null,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
      {
        id: '2',
        type: EventType.item_processed,
        data: {
          item_id: 'item-2',
          payload: { score: 2 },
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
    ]);
  });

  it('queries strictly past the provided cursor', async () => {
    const findMany = jest.fn().mockResolvedValueOnce([]);
    const service = buildService(findMany);

    const messages = [];
    for await (const row of service.iterateEventsSince(42n)) {
      messages.push(row.message);
    }

    expect(messages).toHaveLength(0);
    expect((findMany.mock.calls[0][0] as FindManyArgs).where).toEqual({
      seq: { gt: 42n },
    });
  });

  it('keeps paging while batches are full, advancing the cursor each page', async () => {
    const page1 = Array.from({ length: SSE_EVENT_REPLAY_PAGE_SIZE }, (_, i) =>
      makeEvent(i + 1),
    );
    const page2 = [makeEvent(SSE_EVENT_REPLAY_PAGE_SIZE + 1)];
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);
    const service = buildService(findMany);

    const seqs = [];
    for await (const row of service.iterateEventsSince(null)) {
      seqs.push(row.seq);
    }

    expect(seqs).toHaveLength(SSE_EVENT_REPLAY_PAGE_SIZE + 1);
    expect(seqs.at(-1)).toBe(BigInt(SSE_EVENT_REPLAY_PAGE_SIZE + 1));
    expect(findMany).toHaveBeenCalledTimes(2);
    expect((findMany.mock.calls[1][0] as FindManyArgs).where).toEqual({
      seq: { gt: BigInt(SSE_EVENT_REPLAY_PAGE_SIZE) },
    });
  });
});
