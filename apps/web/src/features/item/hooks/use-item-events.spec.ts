import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  baseApi,
  itemListApi,
  ITEM_EVENT,
} from '@rafiandria23/h3-zoom-test-api-client';

import { useItemEvents } from './use-item-events';

type Listener = (event: Event) => void;

// Minimal EventSource stand-in — jsdom ships none.
class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly init?: EventSourceInit;
  readyState = MockEventSource.CONNECTING;
  closed = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.init = init;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, fn: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(fn);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }

  close() {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }

  emit(type: string, data: unknown) {
    const event = {
      type,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    } as MessageEvent;
    this.dispatch(type, event);
  }

  /** The stream connected. */
  open() {
    this.readyState = MockEventSource.OPEN;
    this.dispatch('open', { type: 'open' } as Event);
  }

  /** A connection attempt failed; `readyState` says whether it will retry. */
  fail(readyState: number = MockEventSource.CONNECTING) {
    this.readyState = readyState;
    this.dispatch('error', { type: 'error' } as Event);
  }

  private dispatch(type: string, event: Event) {
    for (const fn of this.listeners.get(type) ?? []) {
      fn(event);
    }
  }
}

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

type Store = ReturnType<typeof makeStore>;

function seedList(store: Store) {
  // Synchronous cache write (unlike `upsertQueryData`, which runs the thunk).
  // The infinite-query cache holds `{ pages, pageParams }`.
  store.dispatch(
    itemListApi.util.upsertQueryEntries([
      {
        endpointName: 'items',
        arg: undefined,
        value: {
          pages: [
            {
              success: true,
              timestamp: '2026-01-01T00:00:00.000Z',
              data: [
                {
                  id: 'item-1',
                  content_type: 'text',
                  label: 'First',
                  value: 'a',
                  file_ref: null,
                  mime_type: null,
                  size: null,
                  created_at: '2026-01-01T00:00:00.000Z',
                  status: 'pending',
                  result: null,
                },
              ],
              metadata: {
                pagination: { page: 1, size: 20, total: 1 },
                sort: { by: 'created_at', direction: 'desc' },
              },
            },
          ],
          pageParams: [1],
        },
      },
    ]),
  );
}

function firstRow(store: Store) {
  return itemListApi.endpoints.items.select(undefined)(store.getState()).data
    ?.pages?.[0]?.data?.[0];
}

describe('useItemEvents', () => {
  const originalEventSource = global.EventSource;
  let store: Store;

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, children);

  beforeEach(() => {
    jest.useFakeTimers();
    MockEventSource.instances = [];
    (global as unknown as { EventSource: unknown }).EventSource =
      MockEventSource;
    store = makeStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { EventSource: unknown }).EventSource =
      originalEventSource;
  });

  it('opens a credentialed stream to the items events endpoint', () => {
    renderHook(() => useItemEvents(), { wrapper });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toMatch(
      /\/api\/v1\/items\/events$/,
    );
    expect(MockEventSource.instances[0].init).toEqual({ withCredentials: true });
  });

  it('applies an item_processed event straight to the cached row', () => {
    seedList(store);
    renderHook(() => useItemEvents(), { wrapper });

    MockEventSource.instances[0].emit(ITEM_EVENT.processed, {
      item_id: 'item-1',
      payload: { score: 87 },
      created_at: '2026-01-01T00:01:00.000Z',
    });

    expect(firstRow(store)).toMatchObject({
      status: 'done',
      result: { score: 87 },
    });
  });

  it('leaves the cache untouched when the processed item is not present', () => {
    seedList(store);
    renderHook(() => useItemEvents(), { wrapper });

    MockEventSource.instances[0].emit(ITEM_EVENT.processed, {
      item_id: 'ghost',
      payload: { score: 1 },
      created_at: '2026-01-01T00:01:00.000Z',
    });

    expect(firstRow(store)).toMatchObject({ status: 'pending', result: null });
  });

  it('ignores malformed frames', () => {
    seedList(store);
    renderHook(() => useItemEvents(), { wrapper });

    MockEventSource.instances[0].emit(ITEM_EVENT.processed, 'not json');

    expect(firstRow(store)).toMatchObject({ status: 'pending' });
  });

  it('debounces a burst of item_submitted into a single list invalidation', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    renderHook(() => useItemEvents(), { wrapper });
    const source = MockEventSource.instances[0];

    const submitted = {
      item_id: 'x',
      payload: null,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    source.emit(ITEM_EVENT.submitted, submitted);
    source.emit(ITEM_EVENT.submitted, { ...submitted, item_id: 'y' });

    const invalidateType = baseApi.util.invalidateTags(['items']).type;
    const invalidatedBefore = dispatchSpy.mock.calls.filter(
      ([action]) => (action as { type?: string })?.type === invalidateType,
    );
    expect(invalidatedBefore).toHaveLength(0);

    jest.advanceTimersByTime(300);

    const invalidatedAfter = dispatchSpy.mock.calls.filter(
      ([action]) => (action as { type?: string })?.type === invalidateType,
    );
    expect(invalidatedAfter).toHaveLength(1);
  });

  it('closes the stream on unmount and drops a pending invalidation', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const { unmount } = renderHook(() => useItemEvents(), { wrapper });
    const source = MockEventSource.instances[0];

    source.emit(ITEM_EVENT.submitted, {
      item_id: 'x',
      payload: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    unmount();
    jest.advanceTimersByTime(500);

    expect(source.closed).toBe(true);
    const invalidateType = baseApi.util.invalidateTags(['items']).type;
    expect(
      dispatchSpy.mock.calls.filter(
        ([action]) => (action as { type?: string })?.type === invalidateType,
      ),
    ).toHaveLength(0);
  });

  describe('connection status', () => {
    it('starts as connecting', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      expect(result.current.status).toBe('connecting');
    });

    it('reports live once the stream opens', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      act(() => MockEventSource.instances[0].open());
      expect(result.current.status).toBe('live');
    });

    it('reports reconnecting while retrying after a drop', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      act(() => MockEventSource.instances[0].open());
      act(() => MockEventSource.instances[0].fail(MockEventSource.CONNECTING));
      expect(result.current.status).toBe('reconnecting');
    });

    it('falls back to stale after repeated failed attempts', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      const source = MockEventSource.instances[0];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        act(() => source.fail(MockEventSource.CONNECTING));
      }
      expect(result.current.status).toBe('stale');
    });

    it('falls back to stale immediately when the connection is closed', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      act(() => MockEventSource.instances[0].fail(MockEventSource.CLOSED));
      expect(result.current.status).toBe('stale');
    });

    it('recovers to live if the stream reconnects after going stale', () => {
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      const source = MockEventSource.instances[0];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        act(() => source.fail(MockEventSource.CONNECTING));
      }
      expect(result.current.status).toBe('stale');

      act(() => source.open());
      expect(result.current.status).toBe('live');
    });

    it('is stale when EventSource is unavailable', () => {
      (global as unknown as { EventSource?: unknown }).EventSource = undefined;
      const { result } = renderHook(() => useItemEvents(), { wrapper });
      expect(result.current.status).toBe('stale');
    });
  });
});
