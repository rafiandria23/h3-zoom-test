import {
  baseApi,
  useItemControllerListQuery,
} from '@rafiandria23/h3-zoom-test-api-client';

import { makeStore } from './store';

describe('web redux store', () => {
  it('mounts the api-client reducer and middleware', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('re-exports the generated RTK Query hooks', () => {
    expect(typeof useItemControllerListQuery).toBe('function');
  });
});
