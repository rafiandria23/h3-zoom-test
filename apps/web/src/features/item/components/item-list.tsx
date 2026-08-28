'use client';

import { Badge, Callout, Flex, Heading, Spinner, Text } from '@radix-ui/themes';
import { useItemControllerListQuery } from '@rafiandria23/h3-zoom-test-api-client';

import { Accordion, type AccordionEntry } from '@/components';

import { ItemDetail } from './item-detail';
import { ItemStatusBadge } from './item-status-badge';

// Item list as an accordion. Each row shows status + full detail, matching
// `ItemListEntryDto` from apps/api. Polls so `pending` -> `done` flips in
// place once the worker finishes.
export function ItemList() {
  const { data, isLoading, isError } = useItemControllerListQuery(undefined, {
    pollingInterval: 3000,
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
