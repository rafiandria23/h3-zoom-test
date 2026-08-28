import { type FC } from 'react';
import { Grid } from '@radix-ui/themes';

import { ItemForm, ItemList } from '@/features/item';

const Index: FC = () => {
  return (
    <Grid columns={{ initial: '1', md: '2' }} gap="5" width="auto">
      <ItemForm />
      <ItemList />
    </Grid>
  );
};

export default Index;
