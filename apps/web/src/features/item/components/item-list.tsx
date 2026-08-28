'use client';

import { Badge, Callout, Flex, Heading, Spinner, Text } from '@radix-ui/themes';
import { useItemControllerListQuery } from '@rafiandria23/h3-zoom-test-api-client';

import { Accordion, type AccordionEntry } from '@/components';

import { useItemEvents, type SseStatus } from '../hooks/use-item-events';

import { ItemDetail } from './item-detail';
import { ItemStatusBadge } from './item-status-badge';

// Fallback poll interval used whenever the SSE stream isn't `live`.
const FALLBACK_POLL_MS = 30000;

const STREAM_BADGE: Record<
  SseStatus,
  { color: 'green' | 'amber' | 'gray'; label: string }
> = {
  live: { color: 'green', label: 'Live' },
  connecting: { color: 'gray', label: 'Connecting…' },
  reconnecting: { color: 'amber', label: 'Reconnecting…' },
  stale: { color: 'gray', label: 'Polling' },
};

function StreamBadge({ status }: { status: SseStatus }) {
  const { color, label } = STREAM_BADGE[status];
  return (
    <Badge color={color} variant="soft" size="1">
      {label}
    </Badge>
  );
}

// Item list as an accordion. Each row shows status + full detail, matching
// `ItemListEntryDto` from apps/api. The SSE stream drives `pending` -> `done`
// flips in real time; polling only runs as a fallback while the stream is not
// `live`.
export function ItemList() {
  const { status: streamStatus } = useItemEvents();

  const { data, isLoading, isError } = useItemControllerListQuery(undefined, {
    pollingInterval: streamStatus === 'live' ? 0 : FALLBACK_POLL_MS,
  });

  const items = data?.data ?? [];

  const entries: AccordionEntry[] = items.map((item) => ({
    id: item.id,
    header: (
      <Flex align="center" justify="between" gap="2">
        <Text weight="medium" truncate>
          {item.label}
        </Text>
        <ItemStatusBadge status={item.status} />
      </Flex>
    ),
    content: <ItemDetail item={item} />,
  }));

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Heading size="4">Items</Heading>
        {items.length > 0 && (
          <Badge color="gray" variant="soft">
            {items.length}
          </Badge>
        )}
        <StreamBadge status={streamStatus} />
      </Flex>

      {isLoading && (
        <Flex align="center" gap="2">
          <Spinner />
          <Text size="2" color="gray">
            Loading items…
          </Text>
        </Flex>
      )}

      {isError && (
        <Callout.Root color="red" size="1">
          <Callout.Text>Failed to load items.</Callout.Text>
        </Callout.Root>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <Text size="2" color="gray">
          No items yet. Create one on the left.
        </Text>
      )}

      {entries.length > 0 && <Accordion items={entries} />}
    </Flex>
  );
}
