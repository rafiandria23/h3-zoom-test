import { ITEM_EVENT, parseItemEvent } from './item-events';

describe('parseItemEvent', () => {
  it('parses an item_processed event with its result payload', () => {
    const parsed = parseItemEvent({
      type: ITEM_EVENT.processed,
      data: JSON.stringify({
        item_id: 'item-1',
        payload: { score: 42 },
        created_at: '2026-01-01T00:00:00.000Z',
      }),
    });

    expect(parsed).toEqual({
      name: 'item_processed',
      data: {
        item_id: 'item-1',
        payload: { score: 42 },
        created_at: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('parses an item_submitted event with a null payload', () => {
    const parsed = parseItemEvent({
      type: ITEM_EVENT.submitted,
      data: JSON.stringify({
        item_id: 'item-2',
        payload: null,
        created_at: '2026-01-01T00:00:00.000Z',
      }),
    });

    expect(parsed).toEqual({
      name: 'item_submitted',
      data: {
        item_id: 'item-2',
        payload: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('returns null for a heartbeat or otherwise unknown event name', () => {
    expect(parseItemEvent({ type: 'ping', data: '{}' })).toBeNull();
  });

  it('returns null when the data is not valid JSON', () => {
    expect(
      parseItemEvent({ type: ITEM_EVENT.processed, data: 'not json' }),
    ).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(
      parseItemEvent({
        type: ITEM_EVENT.submitted,
        data: JSON.stringify({ item_id: 'x' }),
      }),
    ).toBeNull();
  });

  it('returns null for item_processed without a numeric score', () => {
    expect(
      parseItemEvent({
        type: ITEM_EVENT.processed,
        data: JSON.stringify({
          item_id: 'x',
          payload: {},
          created_at: '2026-01-01T00:00:00.000Z',
        }),
      }),
    ).toBeNull();
  });
});
