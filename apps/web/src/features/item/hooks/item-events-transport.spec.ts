import { createItemEventsHub } from './item-events-worker';
import {
  openItemEventsTransport,
  SHARED_WORKER_PROBE_MS,
  type ItemEventFrame,
  type SseStatus,
} from './item-events-transport';

type Listener = (event: Event) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly init?: EventSourceInit;
  readyState = FakeEventSource.CONNECTING;
  closed = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.init = init;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, fn: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(fn);
    this.listeners.set(type, set);
  }

  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }

  private dispatch(type: string, event: Event) {
    for (const fn of this.listeners.get(type) ?? []) {
      fn(event);
    }
  }

  emitFrame(type: string, data: unknown) {
    this.dispatch(type, {
      type,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    } as MessageEvent);
  }

  open() {
    this.readyState = FakeEventSource.OPEN;
    this.dispatch('open', { type: 'open' } as Event);
  }

  fail(readyState: number = FakeEventSource.CONNECTING) {
    this.readyState = readyState;
    this.dispatch('error', { type: 'error' } as Event);
  }
}

class FakeMessagePort {
  readonly postMessage = jest.fn();
  readonly start = jest.fn();
  readonly close = jest.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: unknown) => void) | null = null;

  /** Simulate a message arriving from the other end. */
  receive(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

class FakeSharedWorker {
  static instances: FakeSharedWorker[] = [];
  static shouldThrow = false;

  readonly port = new FakeMessagePort();
  readonly url: string;
  onerror: ((event: unknown) => void) | null = null;

  constructor(url: string | URL) {
    if (FakeSharedWorker.shouldThrow) {
      throw new Error('worker unsupported');
    }
    this.url = String(url);
    FakeSharedWorker.instances.push(this);
  }
}

const originalEventSource = global.EventSource;
const originalSharedWorker = (global as { SharedWorker?: unknown }).SharedWorker;

function setGlobals(next: {
  EventSource?: unknown;
  SharedWorker?: unknown;
}) {
  (global as { EventSource?: unknown }).EventSource = next.EventSource;
  (global as { SharedWorker?: unknown }).SharedWorker = next.SharedWorker;
}

afterEach(() => {
  (global as { EventSource?: unknown }).EventSource = originalEventSource;
  (global as { SharedWorker?: unknown }).SharedWorker = originalSharedWorker;
  FakeEventSource.instances = [];
  FakeSharedWorker.instances = [];
  FakeSharedWorker.shouldThrow = false;
  jest.clearAllMocks();
});

describe('createItemEventsHub', () => {
  function setup() {
    const created: FakeEventSource[] = [];
    const hub = createItemEventsHub((url) => {
      const es = new FakeEventSource(url);
      created.push(es);
      return es;
    });
    return { hub, created };
  }

  it('opens one upstream stream for many ports and fans frames out to all', () => {
    const { hub, created } = setup();
    const portA = new FakeMessagePort();
    const portB = new FakeMessagePort();

    hub.connect(portA);
    hub.connect(portB);
    portA.receive({ kind: 'subscribe', url: '/events' });
    portB.receive({ kind: 'subscribe', url: '/events' });

    expect(created).toHaveLength(1);

    created[0].emitFrame('item_processed', { item_id: 'x', payload: { score: 1 } });

    const frameFor = (port: FakeMessagePort) =>
      port.postMessage.mock.calls
        .map(([msg]) => msg as { kind: string; frame?: ItemEventFrame })
        .find((msg) => msg.kind === 'frame');
    expect(frameFor(portA)?.frame?.type).toBe('item_processed');
    expect(frameFor(portB)?.frame?.type).toBe('item_processed');
  });

  it('broadcasts status transitions: connecting -> live -> reconnecting -> stale', () => {
    const { hub, created } = setup();
    const port = new FakeMessagePort();
    hub.connect(port);
    port.receive({ kind: 'subscribe', url: '/events' });

    const statuses = () =>
      port.postMessage.mock.calls
        .map(([msg]) => msg as { kind: string; status?: SseStatus })
        .filter((msg) => msg.kind === 'status')
        .map((msg) => msg.status);

    expect(statuses()).toContain('connecting');

    created[0].open();
    expect(statuses()).toContain('live');

    created[0].fail(FakeEventSource.CONNECTING);
    expect(statuses().at(-1)).toBe('reconnecting');

    for (let i = 0; i < 3; i += 1) {
      created[0].fail(FakeEventSource.CONNECTING);
    }
    expect(statuses().at(-1)).toBe('stale');
  });

  it('replies to a late-joining port with the current status', () => {
    const { hub, created } = setup();
    const first = new FakeMessagePort();
    hub.connect(first);
    first.receive({ kind: 'subscribe', url: '/events' });
    created[0].open();

    const late = new FakeMessagePort();
    hub.connect(late);
    late.receive({ kind: 'subscribe', url: '/events' });

    const firstReply = late.postMessage.mock.calls
      .map(([msg]) => msg as { kind: string; status?: SseStatus })
      .find((msg) => msg.kind === 'status');
    expect(firstReply?.status).toBe('live');
  });

  it('closes the upstream stream when the last port leaves and reopens later', () => {
    const { hub, created } = setup();
    const port = new FakeMessagePort();
    hub.connect(port);
    port.receive({ kind: 'subscribe', url: '/events' });
    expect(created).toHaveLength(1);

    port.receive({ kind: 'unsubscribe' });
    expect(created[0].closed).toBe(true);

    const next = new FakeMessagePort();
    hub.connect(next);
    next.receive({ kind: 'subscribe', url: '/events' });
    expect(created).toHaveLength(2);
    expect(created[1].closed).toBe(false);
  });

  it('keeps the stream open while other ports remain', () => {
    const { hub, created } = setup();
    const portA = new FakeMessagePort();
    const portB = new FakeMessagePort();
    hub.connect(portA);
    hub.connect(portB);
    portA.receive({ kind: 'subscribe', url: '/events' });
    portB.receive({ kind: 'subscribe', url: '/events' });

    portA.receive({ kind: 'unsubscribe' });

    expect(created[0].closed).toBe(false);
  });
});

describe('openItemEventsTransport', () => {
  it('prefers a SharedWorker: subscribes, pipes messages, unsubscribes on close', () => {
    setGlobals({ EventSource: FakeEventSource, SharedWorker: FakeSharedWorker });
    const onFrame = jest.fn();
    const onStatus = jest.fn();

    const transport = openItemEventsTransport('/events', { onFrame, onStatus });

    const worker = FakeSharedWorker.instances[0];
    expect(worker).toBeDefined();
    expect(worker.port.start).toHaveBeenCalled();
    expect(worker.port.postMessage).toHaveBeenCalledWith({
      kind: 'subscribe',
      url: '/events',
    });
    expect(FakeEventSource.instances).toHaveLength(0);

    worker.port.receive({ kind: 'status', status: 'live' });
    expect(onStatus).toHaveBeenCalledWith('live');

    worker.port.receive({
      kind: 'frame',
      frame: { type: 'item_processed', data: '{}' },
    });
    expect(onFrame).toHaveBeenCalledWith({ type: 'item_processed', data: '{}' });

    transport.close();
    expect(worker.port.postMessage).toHaveBeenCalledWith({ kind: 'unsubscribe' });
    expect(worker.port.close).toHaveBeenCalled();
  });

  it('falls back to a direct EventSource when SharedWorker is absent', () => {
    setGlobals({ EventSource: FakeEventSource, SharedWorker: undefined });
    const onFrame = jest.fn();
    const onStatus = jest.fn();

    const transport = openItemEventsTransport('/events', { onFrame, onStatus });

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].init).toEqual({ withCredentials: true });
    expect(onStatus).toHaveBeenCalledWith('connecting');

    FakeEventSource.instances[0].open();
    expect(onStatus).toHaveBeenCalledWith('live');

    FakeEventSource.instances[0].emitFrame('item_submitted', { item_id: 'x' });
    expect(onFrame).toHaveBeenCalledWith({
      type: 'item_submitted',
      data: JSON.stringify({ item_id: 'x' }),
    });

    transport.close();
    expect(FakeEventSource.instances[0].closed).toBe(true);
  });

  it('falls back to a direct EventSource when the SharedWorker constructor throws', () => {
    FakeSharedWorker.shouldThrow = true;
    setGlobals({ EventSource: FakeEventSource, SharedWorker: FakeSharedWorker });

    openItemEventsTransport('/events', {
      onFrame: jest.fn(),
      onStatus: jest.fn(),
    });

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('falls back to a direct EventSource when the worker script fails to load', () => {
    setGlobals({ EventSource: FakeEventSource, SharedWorker: FakeSharedWorker });
    const onFrame = jest.fn();
    const onStatus = jest.fn();

    openItemEventsTransport('/events', { onFrame, onStatus });
    expect(FakeEventSource.instances).toHaveLength(0);

    // The browser fires `error` on the worker when its script can't be fetched.
    FakeSharedWorker.instances[0].onerror?.(new Event('error'));

    expect(FakeSharedWorker.instances[0].port.close).toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(onStatus).toHaveBeenCalledWith('connecting');

    FakeEventSource.instances[0].open();
    expect(onStatus).toHaveBeenCalledWith('live');

    FakeEventSource.instances[0].emitFrame('item_submitted', { item_id: 'x' });
    expect(onFrame).toHaveBeenCalledWith({
      type: 'item_submitted',
      data: JSON.stringify({ item_id: 'x' }),
    });
  });

  it('falls back to a direct EventSource when the worker never responds', () => {
    jest.useFakeTimers();
    try {
      setGlobals({
        EventSource: FakeEventSource,
        SharedWorker: FakeSharedWorker,
      });

      openItemEventsTransport('/events', {
        onFrame: jest.fn(),
        onStatus: jest.fn(),
      });
      expect(FakeEventSource.instances).toHaveLength(0);

      jest.advanceTimersByTime(SHARED_WORKER_PROBE_MS);

      expect(FakeEventSource.instances).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops probing and does not fall back once closed', () => {
    jest.useFakeTimers();
    try {
      setGlobals({
        EventSource: FakeEventSource,
        SharedWorker: FakeSharedWorker,
      });

      const transport = openItemEventsTransport('/events', {
        onFrame: jest.fn(),
        onStatus: jest.fn(),
      });
      transport.close();

      FakeSharedWorker.instances[0].onerror?.(new Event('error'));
      jest.advanceTimersByTime(SHARED_WORKER_PROBE_MS);

      expect(FakeEventSource.instances).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports stale when neither transport is available', () => {
    setGlobals({ EventSource: undefined, SharedWorker: undefined });
    const onStatus = jest.fn();

    const transport = openItemEventsTransport('/events', {
      onFrame: jest.fn(),
      onStatus,
    });

    expect(onStatus).toHaveBeenCalledWith('stale');
    expect(() => transport.close()).not.toThrow();
  });
});
