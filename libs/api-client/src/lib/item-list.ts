// Infinite-scroll variant of `GET /api/v1/items`.
//
// The OpenAPI codegen only emits a plain `query` for that endpoint
// (`itemControllerList` in generated.ts). Infinite queries aren't generated, so
// the paged version is declared here by hand on the same `baseApi` singleton —
// the same approach `item-events.ts` takes for the SSE stream.

import { baseApi } from './base-api';
import type { ItemControllerListApiResponse } from './generated';

// Rows fetched per page. Fixed here — there is no page-size UI.
export const PAGE_SIZE = 20;

/**
 * `getNextPageParam` for {@link itemListApi.endpoints.itemsInfinite}. A page
 * shorter than {@link PAGE_SIZE} means the end has been reached — the endpoint
 * reports no grand total (`metadata.pagination.total` is the returned page's row
 * count), so the short page is the only end-of-list signal.
 */
export function getNextPageParam(
  lastPage: ItemControllerListApiResponse,
  _allPages: ItemControllerListApiResponse[],
  lastPageParam: number,
): number | undefined {
  return (lastPage.data?.length ?? 0) < PAGE_SIZE
    ? undefined
    : lastPageParam + 1;
}

export const itemListApi = baseApi
  .enhanceEndpoints({ addTagTypes: ['items'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // Named `items` so the generated hook is `useItemsInfiniteQuery`.
      // Newest first: page 1 is the most recent items, older rows load as the
      // user scrolls toward the tail. The API's own default sort stays `asc`;
      // this endpoint asks for `desc` explicitly.
      items: build.infiniteQuery<ItemControllerListApiResponse, void, number>({
        infiniteQueryOptions: {
          initialPageParam: 1,
          getNextPageParam,
        },
        query: ({ pageParam }) => ({
          url: '/api/v1/items',
          params: {
            page: pageParam,
            size: PAGE_SIZE,
            sort_by: 'created_at',
            sort_direction: 'desc',
          },
        }),
        providesTags: ['items'],
      }),
    }),
  });

export const { useItemsInfiniteQuery } = itemListApi;
