import { baseApi as api } from './base-api';
export const addTagTypes = ['items'] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      itemControllerSubmit: build.mutation<
        ItemControllerSubmitApiResponse,
        ItemControllerSubmitApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/items`,
          method: 'POST',
          body: queryArg.submitItemDto,
        }),
        invalidatesTags: ['items'],
      }),
      itemControllerList: build.query<
        ItemControllerListApiResponse,
        ItemControllerListApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/items`,
          params: {
            page: queryArg.page,
            size: queryArg.size,
            sort_by: queryArg.sortBy,
            sort_direction: queryArg.sortDirection,
          },
        }),
        providesTags: ['items'],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type ItemControllerSubmitApiResponse =
  /** status 200 The created item. */ SuccessTimestampDto & {
    data?: ItemDto;
  };
export type ItemControllerSubmitApiArg = {
  submitItemDto: SubmitItemDto;
};
export type ItemControllerListApiResponse =
  /** status 200 A page of non-deleted items. `metadata.pagination.total` is the row count of the returned page. */ SuccessTimestampDto & {
    data?: ItemListEntryDto[];
    metadata?: PaginationMetadataDto;
  };
export type ItemControllerListApiArg = {
  /** 1-based page number. */
  page?: number;
  /** Rows per page. */
  size?: number;
  sortBy?: ItemSortField;
  sortDirection?: SortDirection;
};
export type SuccessTimestampDto = {
  success: boolean;
  timestamp: string;
};
export type ContentType = 'text' | 'long_text' | 'numeric' | 'file';
export type ItemDto = {
  id: string;
  content_type: ContentType;
  label: string;
  value: ((string | null) | (number | null)) | null;
  file_ref: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type SubmitItemDto = {
  content_type: ContentType;
  label: string;
  /** Required for text/long_text (string) and numeric (number); omitted for file. */
  value?: string | number;
  /** The file to upload (multipart/form-data submissions only). */
  file?: Blob;
};
export type ItemStatus = 'pending' | 'done';
export type ItemResultDto = {
  score: number;
};
export type ItemListEntryDto = {
  id: string;
  content_type: ContentType;
  label: string;
  value: ((string | null) | (number | null)) | null;
  file_ref: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  status: ItemStatus;
  result: ItemResultDto | null;
};
export type PaginationInfoDto = {
  page: number;
  size: number;
  total: number;
};
export type SortDirection = 'asc' | 'desc';
export type SortInfoDto = {
  by: string;
  direction: SortDirection;
};
export type PaginationMetadataDto = {
  pagination: PaginationInfoDto;
  sort: SortInfoDto;
};
export type ItemSortField = 'created_at' | 'updated_at' | 'label';
export const {
  useItemControllerSubmitMutation,
  useItemControllerListQuery,
  useLazyItemControllerListQuery,
} = injectedRtkApi;
