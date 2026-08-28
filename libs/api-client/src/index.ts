export { baseApi } from './lib/base-api';

// Generated from apps/api/openapi.json by the `codegen` target — endpoints,
// typed request/response models, and RTK Query hooks. Regenerate with
// `nx codegen @rafiandria23/h3-zoom-test-api-client`.
export * from './lib/generated';

// Hand-written contract for the SSE stream, which the codegen does not cover.
export * from './lib/item-events';
