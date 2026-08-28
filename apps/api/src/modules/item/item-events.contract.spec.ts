import { EventType } from '../../generated/prisma/enums';
import type { Event } from '../../generated/prisma/client';
import type { DatabaseService } from '../database/database.service';

import { ItemService } from './item.service';

// Mirror of the SSE contract declared by hand in
// libs/api-client/src/lib/item-events.ts. If one of these fails, the client's
// `ITEM_EVENT` / `parseItemEvent` are out of sync with what the API emits and
// must be updated in the same change.
const CLIENT_EVENT_NAMES = ['item_submitted', 'item_processed'] as const;
const CLIENT_MESSAGE_DATA_KEYS = ['item_id', 'payload', 'created_at'] as const;

describe('SSE item-events contract (apps/api <-> libs/api-client)', () => {
  it('persists only event types the client contract knows how to handle', () => {
    // Every persisted event is replayed over the stream regardless of type,
    // so the client must recognise (or explicitly ignore) each one.
    expect([...Object.values(EventType)].sort()).toEqual(
      [...CLIENT_EVENT_NAMES].sort(),
    );
  });

  it('emits messages shaped as { id, type, data: { item_id, payload, created_at } }', async () => {
    const event = {
      id: 'evt-1',
      seq: 7n,
      type: EventType.item_processed,
      payload: { score: 42 },
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      item_id: 'item-1',
    } as Event;

    const db = {
      event: { findMany: jest.fn().mockResolvedValueOnce([event]) },
    } as unknown as DatabaseService;
    const service = new ItemService(
      db,
      {} as never, // itemsQueue - unused here
      {} as never, // config - unused here
      {} as never, // commonService - unused here
    );

    const rows = [];
    for await (const row of service.iterateEventsSince(null)) {
      rows.push(row);
    }

    expect(rows).toHaveLength(1);
    const { message } = rows[0];
    expect(Object.keys(message).sort()).toEqual(['data', 'id', 'type']);
    expect(message.id).toBe('7');
    expect(message.type).toBe('item_processed');
    expect(Object.keys(message.data as object).sort()).toEqual(
      [...CLIENT_MESSAGE_DATA_KEYS].sort(),
    );
  });
});
