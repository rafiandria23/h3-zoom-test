'use client';

import { type FC } from 'react';
import { Box, Card, Flex, Text } from '@radix-ui/themes';
import type { ItemListEntryDto } from '@rafiandria23/h3-zoom-test-api-client';

import accordionStyles from '@/components/ui/accordion.module.scss';

import { ItemDetail } from './item-detail';
import { ItemStatusBadge } from './item-status-badge';

export interface ItemRowProps {
  item: ItemListEntryDto;
  open: boolean;
  onToggle: () => void;
}

// One item as a collapsible card. Split out of the old `Accordion`-based
// `ItemList` so `react-virtuoso` can render and measure each row (rows grow
// when expanded). Reuses the accordion trigger/panel styling.
export const ItemRow: FC<ItemRowProps> = ({ item, open, onToggle }) => {
  return (
    <Card size="1" mb="2">
      <button
        type="button"
        className={accordionStyles.trigger}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={accordionStyles.caret} data-open={open} aria-hidden>
          ▶
        </span>
        <Box flexGrow="1" style={{ minWidth: 0 }}>
          <Flex align="center" justify="between" gap="2">
            <Text weight="medium" truncate>
              {item.label}
            </Text>
            <ItemStatusBadge status={item.status} />
          </Flex>
        </Box>
      </button>

      {open && (
        <Box className={accordionStyles.panel}>
          <ItemDetail item={item} />
        </Box>
      )}
    </Card>
  );
};
