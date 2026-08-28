import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import type { ItemListEntryDto } from '@rafiandria23/h3-zoom-test-api-client';

const fetchNextPage = jest.fn();

// Mutable hook return, set per test. `mock`-prefixed so the jest factory may
// close over it.
const mockHook: {
  current: {
    data?: { pages: { data?: Partial<ItemListEntryDto>[] }[] };
    isLoading: boolean;
    isError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: jest.Mock;
  };
} = {
  current: {
    data: { pages: [{ data: [] }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
  },
};

jest.mock('@rafiandria23/h3-zoom-test-api-client', () => ({
  useItemsInfiniteQuery: () => mockHook.current,
  itemListApi: { util: { invalidateTags: jest.fn(() => ({ type: 'noop' })) } },
}));

// jsdom has no layout; render every row plus a button that fires `endReached`.
jest.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data = [],
    itemContent,
    components,
    endReached,
  }: {
    data?: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
    components?: { Footer?: React.ComponentType };
    endReached?: () => void;
  }) => {
    const Footer = components?.Footer;
    return (
      <div data-testid="virtuoso">
        {data.map((item, index) => (
          <div key={index}>{itemContent(index, item)}</div>
        ))}
        <button
          type="button"
          data-testid="end-reached"
          onClick={() => endReached?.()}
        >
          end
        </button>
        {Footer ? <Footer /> : null}
      </div>
    );
  },
}));

jest.mock('../hooks/use-item-events', () => ({
  useItemEvents: jest.fn(() => ({ status: 'live' })),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

import { ItemList } from './item-list';

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
  global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

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

function row(id: string, label = `Label ${id}`): Partial<ItemListEntryDto> {
  return {
    id,
    content_type: 'text',
    label,
    value: null,
    file_ref: null,
    mime_type: null,
    size: null,
    created_at: '2026-01-01T00:00:00.000Z',
    status: 'pending',
    result: null,
  };
}

function setHook(over: Partial<(typeof mockHook)['current']>) {
  mockHook.current = { ...mockHook.current, ...over };
}

function renderList() {
  return render(
    <Theme>
      <ItemList />
    </Theme>,
  );
}

beforeEach(() => {
  fetchNextPage.mockClear();
  setHook({
    data: { pages: [{ data: [] }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
  });
});

describe('ItemList', () => {
  it('renders the empty state when there are no items', () => {
    renderList();
    expect(screen.getByText(/No items yet/i)).toBeTruthy();
  });

  it('renders one row per item, flattening pages', () => {
    setHook({
      data: { pages: [{ data: [row('a'), row('b')] }, { data: [row('c')] }] },
    });
    renderList();

    expect(screen.getByText('Label a')).toBeTruthy();
    expect(screen.getByText('Label b')).toBeTruthy();
    expect(screen.getByText('Label c')).toBeTruthy();
  });

  it('dedupes rows that share an id across a page boundary', () => {
    setHook({
      data: {
        pages: [{ data: [row('a'), row('dup')] }, { data: [row('dup'), row('b')] }],
      },
    });
    renderList();

    expect(screen.getAllByText('Label dup')).toHaveLength(1);
    // 3 distinct rows -> count badge reads "3"
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('marks the count with a "+" while more pages remain', () => {
    setHook({ data: { pages: [{ data: [row('a')] }] }, hasNextPage: true });
    renderList();
    expect(screen.getByText('1+')).toBeTruthy();
  });

  it('fetches the next page when the list end is reached', () => {
    setHook({ data: { pages: [{ data: [row('a')] }] }, hasNextPage: true });
    renderList();

    fireEvent.click(screen.getByTestId('end-reached'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not fetch again while a page fetch is already in flight', () => {
    setHook({
      data: { pages: [{ data: [row('a')] }] },
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    renderList();

    fireEvent.click(screen.getByTestId('end-reached'));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not fetch past the last page', () => {
    setHook({ data: { pages: [{ data: [row('a')] }] }, hasNextPage: false });
    renderList();

    fireEvent.click(screen.getByTestId('end-reached'));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('shows the footer loader while fetching the next page', () => {
    setHook({
      data: { pages: [{ data: [row('a')] }] },
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    renderList();
    expect(screen.getByText(/Loading more/i)).toBeTruthy();
  });

  it('expands a row to its detail on click', () => {
    setHook({ data: { pages: [{ data: [row('a')] }] } });
    renderList();

    fireEvent.click(screen.getByRole('button', { name: /Label a/i }));
    expect(screen.getByText('Content type')).toBeTruthy();
  });
});
