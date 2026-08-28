import { Badge } from '@radix-ui/themes';
import type { ItemStatus } from '@rafiandria23/h3-zoom-test-api-client';

// `ItemStatus` is derived from the item's event log in apps/api
// (`item.service.ts` -> `listItems`).
export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return status === 'done' ? (
    <Badge color="green">done</Badge>
  ) : (
    <Badge color="amber">pending</Badge>
  );
}
