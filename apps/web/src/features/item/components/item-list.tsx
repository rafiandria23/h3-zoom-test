'use client';

import { type FC, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Badge, Callout, Flex, Heading, Spinner, Text } from '@radix-ui/themes';
import { Virtuoso } from 'react-virtuoso';
import {
  itemListApi,
  useItemsInfiniteQuery,
} from '@rafiandria23/h3-zoom-test-api-client';

import type { AppDispatch } from '@/redux';

import { useItemEvents, type SseStatus } from '../hooks/use-item-events';

import { ItemRow } from './item-row';

// RTK infinite queries take no `pollingInterval`; while the SSE stream isn't
// `live`, refetch the loaded pages on this interval instead.
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

interface StreamBadgeProps {
  status: SseStatus;
}

const StreamBadge: FC<StreamBadgeProps> = ({ status }) => {
  const { color, label } = STREAM_BADGE[status];
  return (
    <Badge color={color} variant="soft" size="1">
      {label}
    </Badge>
  );
};

// Newest-first offset paging can briefly overlap a page boundary when a fresh
// item lands at the head. Drop duplicate ids, keeping the first occurrence.
function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

// Virtualized, infinite-scrolling item list. Pages come from
// `useItemsInfiniteQuery` (newest first); scrolling to the bottom loads the
// next page. The SSE stream (via `useItemEvents`) drives `pending` -> `done`
// flips and pulls in newly submitted items.
export const ItemList: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { status: streamStatus } = useItemEvents();

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useItemsInfiniteQuery();

  const items = dedupeById(
    data?.pages.flatMap((page) => page.data ?? []) ?? [],
  );

  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (streamStatus === 'live') {
      return;
    }
    const timer = setInterval(() => {
      dispatch(itemListApi.util.invalidateTags(['items']));
    }, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [streamStatus, dispatch]);

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Heading size="4">Items</Heading>
        {items.length > 0 && (
          <Badge color="gray" variant="soft">
            {items.length}
            {hasNextPage ? '+' : ''}
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

      {items.length > 0 && (
        <Virtuoso
          useWindowScroll
          data={items}
          computeItemKey={(_, item) => item.id}
          itemContent={(_, item) => (
            <ItemRow
              item={item}
              open={openId === item.id}
              onToggle={() =>
                setOpenId((current) =>
                  current === item.id ? null : item.id,
                )
              }
            />
          )}
          endReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          components={{
            Footer: () =>
              isFetchingNextPage ? (
                <Flex align="center" justify="center" gap="2" py="3">
                  <Spinner />
                  <Text size="2" color="gray">
                    Loading more…
                  </Text>
                </Flex>
              ) : null,
          }}
        />
      )}
    </Flex>
  );
};
