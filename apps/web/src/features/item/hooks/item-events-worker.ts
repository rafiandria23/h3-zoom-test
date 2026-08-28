// Shared worker for the item events stream: one upstream `EventSource` kept
// open for however many tab ports are connected, every frame and status change
// fanned out to all of them. The hub logic is exported so it can be unit
// tested with fakes; the `self.onconnect` shim at the bottom only runs inside
// an actual SharedWorker.

import {
  ITEM_EVENT_NAMES,
  nextConnectionStatus,
  type SseStatus,
} from './item-events-transport';

type InboundMessage = { kind: 'subscribe'; url: string } | { kind: 'unsubscribe' };

interface EventSourceLike {
  readyState: number;
  close: () => void;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
}

export interface ItemEventsHub {
  connect: (port: MessagePort) => void;
}

export function createItemEventsHub(
  createEventSource: (url: string) => EventSourceLike,
): ItemEventsHub {
  const ports = new Set<MessagePort>();
  let source: EventSourceLike | null = null;
  let failures = 0;
  let status: SseStatus = 'connecting';

  const broadcast = (message: unknown) => {
    for (const port of ports) {
      port.postMessage(message);
    }
  };

  const setStatus = (next: SseStatus) => {
    status = next;
    broadcast({ kind: 'status', status });
  };

  const ensureStream = (url: string) => {
    if (source) {
      return;
    }
    failures = 0;
    setStatus('connecting');

    const stream = createEventSource(url);
    source = stream;

    stream.addEventListener('open', () => {
      failures = 0;
      setStatus('live');
    });
    stream.addEventListener('error', () => {
      failures += 1;
      setStatus(nextConnectionStatus(failures, stream.readyState === 2));
    });
    for (const name of ITEM_EVENT_NAMES) {
      stream.addEventListener(name, (event) => {
        broadcast({
          kind: 'frame',
          frame: { type: event.type, data: (event as MessageEvent).data },
        });
      });
    }
  };

  const teardownIfIdle = () => {
    if (ports.size === 0 && source) {
      source.close();
      source = null;
      failures = 0;
      status = 'connecting';
    }
  };

  return {
    connect(port) {
      ports.add(port);
      port.onmessage = (event: MessageEvent) => {
        const message = event.data as InboundMessage;
        if (message.kind === 'subscribe') {
          ensureStream(message.url);
          port.postMessage({ kind: 'status', status });
        } else if (message.kind === 'unsubscribe') {
          ports.delete(port);
          teardownIfIdle();
        }
      };
      port.start();
    },
  };
}

// Wire the hub to the SharedWorker connect event — only in an actual worker
// scope, never when this module is imported from a test or the main thread.
// `SharedWorkerGlobalScope` isn't in the `dom` lib, so its shape is declared
// minimally here rather than pulling in the conflicting `webworker` lib.
interface SharedWorkerConnectEvent {
  readonly ports: ReadonlyArray<MessagePort>;
}
interface SharedWorkerScope {
  onconnect: ((event: SharedWorkerConnectEvent) => void) | null;
}

declare const self: (SharedWorkerScope & typeof globalThis) | undefined;

if (
  typeof self !== 'undefined' &&
  'SharedWorkerGlobalScope' in (self as object)
) {
  const hub = createItemEventsHub(
    (url) => new EventSource(url, { withCredentials: true }),
  );
  self.onconnect = (event) => hub.connect(event.ports[0]);
}
