'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';

import { makeStore, type AppStore } from '@/redux/store';

// Creates the store once on the client and wires RTK Query's refetch-on-focus
// / refetch-on-reconnect listeners.
export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  storeRef.current ??= makeStore();

  useEffect(() => {
    if (!storeRef.current) {
      return;
    }
    return setupListeners(storeRef.current.dispatch);
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
