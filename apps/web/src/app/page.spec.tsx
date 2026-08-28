import React from 'react';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';

// Stub the RTK Query hooks so the page renders without a live store or
// network. Shapes mirror `useItemsInfiniteQuery` / `ItemControllerSubmit`.
const submitTrigger = jest.fn().mockResolvedValue({});

jest.mock('@rafiandria23/h3-zoom-test-api-client', () => ({
  useItemsInfiniteQuery: jest.fn(() => ({
    data: { pages: [{ data: [] }], pageParams: [1] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  })),
  useItemControllerSubmitMutation: jest.fn(() => [
    submitTrigger,
    { isLoading: false, isSuccess: false, isError: false },
  ]),
  itemListApi: { util: { invalidateTags: jest.fn(() => ({ type: 'noop' })) } },
}));

// jsdom has no layout, so real `Virtuoso` renders nothing — render every row
// synchronously plus the footer.
jest.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data = [],
    itemContent,
    components,
  }: {
    data?: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
    components?: { Footer?: React.ComponentType };
  }) => {
    const Footer = components?.Footer;
    return (
      <div data-testid="virtuoso">
        {data.map((item, index) => (
          <div key={index}>{itemContent(index, item)}</div>
        ))}
        {Footer ? <Footer /> : null}
      </div>
    );
  },
}));

// `ItemList` calls `useDispatch` for its polling-fallback effect; no store is
// wired up in this page-level render test.
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

// The SSE hook talks to the store and EventSource; neither is wired up in
// this page-level render test, and it has its own unit tests.
jest.mock('@/features/item/hooks/use-item-events', () => ({
  useItemEvents: jest.fn(() => ({ status: 'live' })),
}));

// The upload hook talks to the store and XHR; not wired up here either, and it
// has its own unit tests.
jest.mock('@/features/item/hooks/use-item-upload', () => ({
  useItemUpload: jest.fn(() => ({
    upload: jest.fn().mockResolvedValue(undefined),
    abort: jest.fn(),
    reset: jest.fn(),
    progress: 0,
    status: 'idle',
    isUploading: false,
    isSuccess: false,
    isError: false,
  })),
}));

import Page from './page';

// jsdom gaps that Radix Themes primitives (Select / ScrollArea) rely on.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  }
  global.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

function renderPage() {
  return render(
    <Theme>
      <Page />
    </Theme>,
  );
}

describe('Page', () => {
  it('should render successfully', () => {
    const { baseElement } = renderPage();
    expect(baseElement).toBeTruthy();
  });

  it('renders both panes of the split view', () => {
    renderPage();
    expect(screen.getByText('Create item')).toBeTruthy();
    expect(screen.getByText('Items')).toBeTruthy();
  });
});
