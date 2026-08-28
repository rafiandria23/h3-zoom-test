import { type ReactNode } from 'react';
import { Flex, Text } from '@radix-ui/themes';

export interface DetailListEntry {
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  items: DetailListEntry[];
}

// A label/value column — right-aligned values that wrap on long tokens.
export function DetailList({ items }: DetailListProps) {
  return (
    <Flex direction="column" gap="2">
      {items.map(({ label, value }) => (
        <Flex key={label} gap="3" justify="between" align="start">
          <Text size="1" color="gray" style={{ flexShrink: 0 }}>
            {label}
          </Text>
          <Text size="1" style={{ textAlign: 'right', wordBreak: 'break-all' }}>
            {value}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
