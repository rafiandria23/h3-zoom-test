// SSE contract for `GET /api/v1/items/events`.
//
// That endpoint is excluded from the OpenAPI document (`@ApiExcludeEndpoint()`
// in apps/api), so the generated client does not cover it and it is declared
// here by hand. The event names mirror the Prisma `EventType` enum and the
// payload mirrors `ItemService.toMessage()`, both in apps/api; server-side
// drift is caught by `item-events.contract.spec.ts` there.

import type { ItemResultDto } from './generated';

/** Item stream event names. The `ping` keep-alive is deliberately not listed. */
export const ITEM_EVENT = {
  submitted: 'item_submitted',
  processed: 'item_processed',
} as const;

export type ItemEventName = (typeof ITEM_EVENT)[keyof typeof ITEM_EVENT];

/** `data` field carried by every non-heartbeat item event. */
export interface ItemEventData {
  item_id: string;
  /** The worker's result on `item_processed`; `null` on `item_submitted`. */
  payload: ItemResultDto | null;
  created_at: string;
}

export interface ItemSubmittedEvent {
  name: typeof ITEM_EVENT.submitted;
  data: ItemEventData & { payload: null };
}

export interface ItemProcessedEvent {
  name: typeof ITEM_EVENT.processed;
  data: ItemEventData & { payload: ItemResultDto };
}

export type ItemEvent = ItemSubmittedEvent | ItemProcessedEvent;

/** The subset of a DOM `MessageEvent` that {@link parseItemEvent} reads. */
export interface RawItemMessage {
  type: string;
  data: string;
}

/**
 * Narrows a raw SSE message into a typed {@link ItemEvent}, or `null` for
 * anything that is not a recognised item event or whose `data` is not the
 * expected JSON shape — so callers can safely ignore heartbeats, malformed
 * frames, and event types added later.
 */
export function parseItemEvent(message: RawItemMessage): ItemEvent | null {
  const name = message.type;
  if (name !== ITEM_EVENT.submitted && name !== ITEM_EVENT.processed) {
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(message.data);
  } catch {
    return null;
  }

  if (!isItemEventData(data)) {
    return null;
  }

  if (name === ITEM_EVENT.processed && !isItemResult(data.payload)) {
    return null;
  }

  return { name, data } as ItemEvent;
}

function isItemEventData(value: unknown): value is ItemEventData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['item_id'] === 'string' &&
    typeof record['created_at'] === 'string' &&
    'payload' in record
  );
}

function isItemResult(value: unknown): value is ItemResultDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['score'] === 'number'
  );
}
