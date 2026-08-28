import { Separator } from '@radix-ui/themes';
import type { ItemListEntryDto } from '@rafiandria23/h3-zoom-test-api-client';

import { DetailList } from '@/components';

// Expanded accordion panel for a single item — every field from
// `ItemListEntryDto` in apps/api.
export function ItemDetail({ item }: { item: ItemListEntryDto }) {
  return (
    <>
      <Separator size="4" mb="3" />
      <DetailList
        items={[
          { label: 'ID', value: item.id },
          { label: 'Content type', value: item.content_type },
          ...(item.value != null
            ? [{ label: 'Value', value: String(item.value) }]
            : []),
          ...(item.file_ref
            ? [{ label: 'File ref', value: item.file_ref }]
            : []),
          ...(item.mime_type
            ? [{ label: 'MIME type', value: item.mime_type }]
            : []),
          ...(item.size != null
            ? [{ label: 'Size', value: `${item.size} bytes` }]
            : []),
          { label: 'Created', value: new Date(item.created_at).toLocaleString() },
          {
            label: 'Score',
            value: item.result ? String(item.result.score) : '—',
          },
        ]}
      />
    </>
  );
}
