import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Origin of the API. `NEXT_PUBLIC_API_URL` is inlined by Next at build time;
// the fallback matches the API's default host/port (see apps/api config).
// Endpoint paths already carry the `/api/v1` global prefix (see openapi.json).
const baseUrl =
  (typeof process !== 'undefined' && process.env?.['NEXT_PUBLIC_API_URL']) ||
  'http://127.0.0.1:3000';

// Empty shell that the generated endpoints are injected into
// (see generated.ts, produced by the `codegen` target). Consumers add
// `baseApi.reducer` / `baseApi.middleware` to their store.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl, credentials: 'include' }),
  endpoints: () => ({}),
});
