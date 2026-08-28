'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  api,
  ITEM_EVENT,
  parseItemEvent,
} from '@rafiandria23/h3-zoom-test-api-client';

import type { AppDispatch } from '@/redux';

import {
  openItemEventsTransport,
  type SseStatus,
} from './item-events-transport';

export type { SseStatus } from './item-events-transport';

// API origin. Mirrors the fallback in the api-client base query
// (`NEXT_PUBLIC_API_URL` is inlined by Next at build time).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';

// `item_submitted` carries only an id, so it can't be applied locally and
// forces a refetch instead. The stream replays its backlog on every
// (re)connect, so collapse that burst into a single refetch.
const INVALIDATE_DEBOUNCE_MS = 300;

/**
 * Subscribes to `GET /api/v1/items/events` (SSE) and keeps the cached item
 * list fresh in real time:
 *
 * - `item_processed` is applied straight to the cached row (`pending` ->
 *   `done`, plus its result) — no network round-trip.
 * - `item_submitted` (a new row the event can't fully describe) marks the
 *   list stale, debounced so a backlog replay triggers one refetch.
 *
 * The underlying stream is shared across tabs by a `SharedWorker` where
 * available (see {@link openItemEventsTransport}). Returns the live connection
 * {@link SseStatus}; callers keep a polling fallback running whenever it isn't
 * `live`.
 */
export function useItemEvents(): { status: SseStatus } {
  const dispatch = useDispatch<AppDispatch>();
  const [status, setStatus] = useState<SseStatus>('connecting');

  // Tie the subscription to mount/unmount only; a new dispatch identity must
  // not tear it down and reopen it.
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let invalidateTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleInvalidate = () => {
      clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(() => {
        dispatchRef.current(api.util.invalidateTags(['items']));
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const transport = openItemEventsTransport(
      `${API_URL}/api/v1/items/events`,
      {
        onStatus: setStatus,
        onFrame: (frame) => {
          const event = parseItemEvent(frame);
          if (!event) {
            return;
          }

          if (event.name === ITEM_EVENT.processed) {
            dispatchRef.current(
              api.util.updateQueryData(
                'itemControllerList',
                undefined,
                (draft) => {
                  const entry = draft.data?.find(
                    (row) => row.id === event.data.item_id,
                  );
                  if (entry) {
                    entry.status = 'done';
                    entry.result = event.data.payload;
                  }
                },
              ),
            );
            return;
          }

          // item_submitted
          scheduleInvalidate();
        },
      },
    );

    return () => {
      clearTimeout(invalidateTimer);
      transport.close();
    };
  }, []);

  return { status };
}
