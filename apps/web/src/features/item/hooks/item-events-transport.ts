'use client';

import type { ItemEventName } from '@rafiandria23/h3-zoom-test-api-client';

export type SseStatus = 'connecting' | 'live' | 'reconnecting' | 'stale';

// Raw SSE frame, forwarded verbatim from the stream (worker or direct) to the
// hook, which does the parsing.
export interface ItemEventFrame {
  type: string;
  data: string;
}

export interface TransportHandlers {
  onFrame: (frame: ItemEventFrame) => void;
  onStatus: (status: SseStatus) => void;
}

export interface ItemEventsTransport {
  close: () => void;
}

// Event names the stream delivers as discrete events (each needs its own
// listener). Typed against the shared contract, kept as literals so this
// module carries no runtime dependency on the api-client barrel — it is also
// bundled into the worker.
export const ITEM_EVENT_NAMES: readonly ItemEventName[] = [
  'item_submitted',
  'item_processed',
];

// Consecutive failed connection attempts before the stream is treated as down
// and polling takes over. The stream keeps retrying underneath.
export const RECONNECT_ATTEMPTS_BEFORE_STALE = 4;

// How long to wait for the shared worker's first message before assuming its
// script never loaded — some bundlers (e.g. Turbopack in dev) don't emit a
// fetchable module-worker chunk, which surfaces as "Failed to fetch a worker
// script" and an `error` event rather than a constructor throw. Either signal
// swaps us to a per-tab EventSource.
export const SHARED_WORKER_PROBE_MS = 3000;

export function nextConnectionStatus(
  failures: number,
  closed: boolean,
): SseStatus {
  return closed || failures >= RECONNECT_ATTEMPTS_BEFORE_STALE
    ? 'stale'
    : 'reconnecting';
}

/**
 * Opens a stream of item events, shared across same-origin tabs by a
 * `SharedWorker` where available, degrading to a per-tab `EventSource`, and
 * finally to nothing (status `stale`, so the caller keeps polling).
 *
 * The `SharedWorker` can also fail *after* construction — its script 404s, or
 * the bundler never emitted it — so a load error (or simply no first message
 * within {@link SHARED_WORKER_PROBE_MS}) transparently swaps in the direct
 * `EventSource` without the caller noticing.
 */
export function openItemEventsTransport(
  url: string,
  handlers: TransportHandlers,
): ItemEventsTransport {
  let closed = false;
  let switched = false;
  let active: ItemEventsTransport | null = null;

  const fallBackToDirect = () => {
    if (closed || switched) {
      return;
    }
    switched = true;
    active?.close();
    active = tryOpenDirect(url, handlers) ?? openInert(handlers);
  };

  active =
    tryOpenShared(url, handlers, fallBackToDirect) ??
    tryOpenDirect(url, handlers) ??
    openInert(handlers);

  return {
    close: () => {
      closed = true;
      active?.close();
      active = null;
    },
  };
}

function tryOpenShared(
  url: string,
  handlers: TransportHandlers,
  onFailure: () => void,
): ItemEventsTransport | null {
  if (typeof SharedWorker === 'undefined') {
    return null;
  }

  let worker: SharedWorker;
  try {
    worker = new SharedWorker(
      new URL('./item-events-worker.ts', import.meta.url),
      { name: 'item-events', type: 'module' },
    );
  } catch {
    // The bundler/runtime can't give us the worker here — fall through.
    return null;
  }

  const { port } = worker;
  let alive = true;

  const giveUp = () => {
    if (!alive) {
      return;
    }
    alive = false;
    clearTimeout(probe);
    try {
      port.close();
    } catch {
      /* the port may already be dead — nothing to do */
    }
    onFailure();
  };

  // If the worker's script failed to load we may never hear back at all;
  // treat a long silence the same as an explicit error.
  const probe = setTimeout(giveUp, SHARED_WORKER_PROBE_MS);

  worker.onerror = giveUp;
  port.onmessageerror = giveUp;
  port.onmessage = (event: MessageEvent) => {
    clearTimeout(probe);
    const message = event.data as
      | { kind: 'frame'; frame: ItemEventFrame }
      | { kind: 'status'; status: SseStatus };
    if (message.kind === 'frame') {
      handlers.onFrame(message.frame);
    } else {
      handlers.onStatus(message.status);
    }
  };
  port.start();
  port.postMessage({ kind: 'subscribe', url });

  return {
    close: () => {
      clearTimeout(probe);
      if (!alive) {
        return;
      }
      alive = false;
      try {
        port.postMessage({ kind: 'unsubscribe' });
        port.close();
      } catch {
        /* the port may already be dead — nothing to do */
      }
    },
  };
}

function tryOpenDirect(
  url: string,
  handlers: TransportHandlers,
): ItemEventsTransport | null {
  if (typeof EventSource === 'undefined') {
    return null;
  }

  const source = new EventSource(url, { withCredentials: true });
  let failures = 0;

  handlers.onStatus('connecting');

  source.addEventListener('open', () => {
    failures = 0;
    handlers.onStatus('live');
  });
  source.addEventListener('error', () => {
    failures += 1;
    handlers.onStatus(
      nextConnectionStatus(failures, source.readyState === EventSource.CLOSED),
    );
  });
  for (const name of ITEM_EVENT_NAMES) {
    source.addEventListener(name, (event) => {
      handlers.onFrame({
        type: event.type,
        data: (event as MessageEvent).data,
      });
    });
  }

  return { close: () => source.close() };
}

function openInert(handlers: TransportHandlers): ItemEventsTransport {
  handlers.onStatus('stale');
  return { close: () => undefined };
}
