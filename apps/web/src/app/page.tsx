import { type FC } from 'react';
import { Box, Grid } from '@radix-ui/themes';

import { ItemForm, ItemList } from '@/features/item';

const Index: FC = () => {
  return (
    <Grid
      columns={{ initial: '1', md: '2' }}
      // The list row takes whatever height is left; on a single column the form
      // row stays content-sized above it.
      rows={{ initial: 'auto minmax(0, 1fr)', md: 'minmax(0, 1fr)' }}
      gap="5"
      width="auto"
      height="100%"
      minHeight="0"
    >
      {/* Plain cell: it stretches to the row, but the form inside keeps its
          natural height instead of filling down. */}
      <Box>
        <ItemForm />
      </Box>
      <ItemList />
    </Grid>
  );
};

export default Index;
