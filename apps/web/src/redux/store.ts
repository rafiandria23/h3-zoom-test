import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@rafiandria23/h3-zoom-test-api-client';

// A fresh store per request (Next App Router / SSR). Client components get a
// single instance via StoreProvider; the server never shares one across
// requests.
export const makeStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
