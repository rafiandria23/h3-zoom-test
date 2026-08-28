import { Grid } from '@radix-ui/themes';

import { ItemForm, ItemList } from '@/features/item';

export default function Index() {
  return (
    <Grid columns={{ initial: '1', md: '2' }} gap="5" width="auto">
      <ItemForm />
      <ItemList />
    </Grid>
  );
}
