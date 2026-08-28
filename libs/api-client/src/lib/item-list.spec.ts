import { getNextPageParam, PAGE_SIZE } from './item-list';
import type { ItemControllerListApiResponse } from './generated';

function page(rows: number): ItemControllerListApiResponse {
  return {
    success: true,
    timestamp: '2026-01-01T00:00:00.000Z',
    data: Array.from({ length: rows }, (_, i) => ({
      id: `item-${i}`,
    })) as ItemControllerListApiResponse['data'],
    metadata: {
      pagination: { page: 1, size: PAGE_SIZE, total: rows },
      sort: { by: 'created_at', direction: 'desc' },
    },
  };
}

describe('getNextPageParam', () => {
  it('advances to the next page when the page came back full', () => {
    expect(getNextPageParam(page(PAGE_SIZE), [], 1)).toBe(2);
    expect(getNextPageParam(page(PAGE_SIZE), [], 7)).toBe(8);
  });

  it('stops when the page came back short', () => {
    expect(getNextPageParam(page(PAGE_SIZE - 1), [], 3)).toBeUndefined();
  });

  it('stops on an empty page', () => {
    expect(getNextPageParam(page(0), [], 1)).toBeUndefined();
  });

  it('stops when the response carries no data array', () => {
    expect(
      getNextPageParam(
        { success: true, timestamp: '2026-01-01T00:00:00.000Z' },
        [],
        1,
      ),
    ).toBeUndefined();
  });
});
