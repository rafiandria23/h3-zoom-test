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
        query: () => ({ url: `/api/v1/items` }),
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
  /** status 200 All non-deleted items, oldest first. */ SuccessTimestampDto & {
    data?: ItemListEntryDto[];
    metadata?: CountMetadataDto;
  };
export type ItemControllerListApiArg = void;
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
  file_ref?: string;
  mime_type?: string;
  size?: number;
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
export type CountMetadataDto = {
  count: number;
};
export const {
  useItemControllerSubmitMutation,
  useItemControllerListQuery,
  useLazyItemControllerListQuery,
} = injectedRtkApi;
