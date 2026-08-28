'use client';

import { useEffect, useRef, type FC, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';

import { makeStore, type AppStore } from '@/redux/store';

export interface StoreProviderProps {
  children: ReactNode;
}

// Creates the store once on the client and wires RTK Query's refetch-on-focus
// / refetch-on-reconnect listeners.
export const StoreProvider: FC<StoreProviderProps> = ({ children }) => {
  const storeRef = useRef<AppStore | null>(null);
  storeRef.current ??= makeStore();

  useEffect(() => {
    if (!storeRef.current) {
      return;
    }
    return setupListeners(storeRef.current.dispatch);
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
};
