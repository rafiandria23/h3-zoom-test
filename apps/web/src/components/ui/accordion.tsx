'use client';

import { type FC, type ReactNode, useState } from 'react';
import { Box, Card, Flex } from '@radix-ui/themes';

import styles from './accordion.module.scss';

export interface AccordionEntry {
  id: string;
  header: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionEntry[];
}

// Controlled single-open disclosure list. Generic on purpose — callers supply
// the header/content for each row.
export const Accordion: FC<AccordionProps> = ({ items }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Flex direction="column" gap="2">
      {items.map(({ id, header, content }) => {
        const open = openId === id;

        return (
          <Card key={id} size="1">
            <button
              type="button"
              className={styles.trigger}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : id)}
            >
              <span className={styles.caret} data-open={open} aria-hidden>
                ▶
              </span>
              <Box flexGrow="1" style={{ minWidth: 0 }}>
                {header}
              </Box>
            </button>

            {open && <Box className={styles.panel}>{content}</Box>}
          </Card>
        );
      })}
    </Flex>
  );
};
