import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { api, baseApi } from '@rafiandria23/h3-zoom-test-api-client';

import { useItemUpload } from './use-item-upload';

type Handler = (event: unknown) => void;

// Minimal XMLHttpRequest stand-in — jsdom's does no real networking, and we
// need to drive `upload` progress / `load` / `error` / `abort` by hand.
class MockXhr {
  static instances: MockXhr[] = [];

  method = '';
  url = '';
  withCredentials = false;
  status = 0;
  sent?: FormData;

  private readonly handlers = new Map<string, Handler[]>();
  readonly upload = {
    handlers: new Map<string, Handler[]>(),
    addEventListener(type: string, fn: Handler) {
      const list = this.handlers.get(type) ?? [];
      list.push(fn);
      this.handlers.set(type, list);
    },
  };

  constructor() {
    MockXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  addEventListener(type: string, fn: Handler) {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }

  send(body: FormData) {
    this.sent = body;
  }

  abort() {
    this.dispatch('abort');
  }

  // ---- test drivers ----
  emitProgress(loaded: number, total: number) {
    for (const fn of this.upload.handlers.get('progress') ?? []) {
      fn({ lengthComputable: true, loaded, total });
    }
  }

  emitLoad(status: number) {
    this.status = status;
    this.dispatch('load');
  }

  emitError() {
    this.dispatch('error');
  }

  private dispatch(type: string) {
    for (const fn of this.handlers.get(type) ?? []) {
      fn({});
    }
  }
}

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

type Store = ReturnType<typeof makeStore>;

describe('useItemUpload', () => {
  const originalXhr = global.XMLHttpRequest;
  let store: Store;

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, children);

  const file = new File(['hello world'], 'report.pdf', {
    type: 'application/pdf',
  });

  beforeEach(() => {
    MockXhr.instances = [];
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = MockXhr;
    store = makeStore();
  });

  afterEach(() => {
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
      originalXhr;
  });

  it('POSTs credentialed multipart form data to the items endpoint', () => {
    const { result } = renderHook(() => useItemUpload(), { wrapper });

    act(() => {
      void result.current.upload({ file, label: 'Q3', contentType: 'file' });
    });

    const xhr = MockXhr.instances[0];
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toMatch(/\/api\/v1\/items$/);
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.sent?.get('content_type')).toBe('file');
    expect(xhr.sent?.get('label')).toBe('Q3');
    expect(xhr.sent?.get('file')).toBeInstanceOf(File);
    expect(result.current.isUploading).toBe(true);
  });

  it('tracks upload progress as a 0–100 percentage', () => {
    const { result } = renderHook(() => useItemUpload(), { wrapper });
    act(() => {
      void result.current.upload({ file, label: 'Q3', contentType: 'file' });
    });

    act(() => MockXhr.instances[0].emitProgress(25, 100));
    expect(result.current.progress).toBe(25);

    act(() => MockXhr.instances[0].emitProgress(90, 100));
    expect(result.current.progress).toBe(90);
  });

  it('resolves and invalidates the items cache on a 2xx response', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const { result } = renderHook(() => useItemUpload(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.upload({
        file,
        label: 'Q3',
        contentType: 'file',
      });
    });

    act(() => MockXhr.instances[0].emitLoad(201));
    await act(async () => {
      await pending;
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.progress).toBe(100);

    const invalidateType = api.util.invalidateTags(['items']).type;
    expect(
      dispatchSpy.mock.calls.some(
        ([action]) => (action as { type?: string })?.type === invalidateType,
      ),
    ).toBe(true);
  });

  it('rejects and reports an error on a non-2xx response', async () => {
    const { result } = renderHook(() => useItemUpload(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.upload({
        file,
        label: 'Q3',
        contentType: 'file',
      });
    });

    act(() => MockXhr.instances[0].emitLoad(500));
    await expect(pending).rejects.toThrow(/HTTP 500/);
    expect(result.current.isError).toBe(true);
  });

  it('rejects and reports an error on a network failure', async () => {
    const { result } = renderHook(() => useItemUpload(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.upload({
        file,
        label: 'Q3',
        contentType: 'file',
      });
    });

    act(() => MockXhr.instances[0].emitError());
    await expect(pending).rejects.toThrow('Upload failed');
    expect(result.current.isError).toBe(true);
  });

  it('reset() aborts an in-flight upload and clears progress', async () => {
    const { result } = renderHook(() => useItemUpload(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.upload({
        file,
        label: 'Q3',
        contentType: 'file',
      });
    });
    pending.catch(() => undefined);

    act(() => MockXhr.instances[0].emitProgress(40, 100));
    act(() => result.current.reset());

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.progress).toBe(0);
  });
});
