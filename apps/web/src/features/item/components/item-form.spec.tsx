import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';

const submitTrigger = jest
  .fn()
  .mockReturnValue({ unwrap: () => Promise.resolve({}) });
const uploadFile = jest.fn().mockResolvedValue(undefined);
const resetUpload = jest.fn();

jest.mock('@rafiandria23/h3-zoom-test-api-client', () => ({
  useItemControllerSubmitMutation: jest.fn(() => [
    submitTrigger,
    { isLoading: false, isSuccess: false, isError: false },
  ]),
}));

jest.mock('../hooks/use-item-upload', () => ({
  useItemUpload: jest.fn(() => ({
    upload: uploadFile,
    reset: resetUpload,
    progress: 0,
    isUploading: false,
    isSuccess: false,
    isError: false,
  })),
}));

import { ItemForm } from './item-form';

// jsdom gaps that Radix Themes primitives (Select) rely on.
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

  const noop = () => {
    /* noop */
  };
  Element.prototype.hasPointerCapture ||= () => false;
  Element.prototype.setPointerCapture ||= noop;
  Element.prototype.releasePointerCapture ||= noop;
  Element.prototype.scrollIntoView ||= noop;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function renderForm() {
  return render(
    <Theme>
      <ItemForm />
    </Theme>,
  );
}

function getForm(): HTMLFormElement {
  return screen
    .getByRole('button', { name: /submit/i })
    .closest('form') as HTMLFormElement;
}

// Radix Select supports typeahead on the closed, focused trigger: pressing the
// first letter of an option selects it without opening the listbox (which needs
// more of the DOM than jsdom provides).
function selectContentType(letter: string) {
  const trigger = screen.getByRole('combobox');
  trigger.focus();
  fireEvent.keyDown(trigger, { key: letter });
}

describe('ItemForm', () => {
  it('marks Label and Value as required', () => {
    renderForm();

    expect(screen.getByText('Label').closest('div')?.textContent).toContain('*');
    expect(screen.getByText('Value').closest('div')?.textContent).toContain('*');
  });

  it('blocks submission and shows a required error when Label is empty', async () => {
    renderForm();

    fireEvent.submit(getForm());

    expect(await screen.findByText('Label is required.')).toBeTruthy();
    expect(submitTrigger).not.toHaveBeenCalled();
  });

  it('shows the per-content-type error when the value is missing', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Quarterly report'), {
      target: { value: 'My label' },
    });
    fireEvent.submit(getForm());

    expect(
      await screen.findByText('Value is required for text content.'),
    ).toBeTruthy();
    expect(submitTrigger).not.toHaveBeenCalled();
  });

  it('submits a valid text item through the JSON mutation', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Quarterly report'), {
      target: { value: 'My label' },
    });
    fireEvent.change(screen.getByPlaceholderText('Some text'), {
      target: { value: 'hello' },
    });
    fireEvent.submit(getForm());

    await waitFor(() => {
      expect(submitTrigger).toHaveBeenCalledWith({
        submitItemDto: {
          content_type: 'text',
          label: 'My label',
          value: 'hello',
        },
      });
    });
  });

  it('accepts a dropped file and uploads it', async () => {
    renderForm();

    selectContentType('f');

    const dropzone = await screen.findByRole('button', {
      name: /drag and drop, or activate to browse/i,
    });

    fireEvent.change(screen.getByPlaceholderText('Quarterly report'), {
      target: { value: 'A file' },
    });

    const file = new File(['contents'], 'report.pdf', {
      type: 'application/pdf',
    });

    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(await screen.findByText('report.pdf')).toBeTruthy();

    fireEvent.submit(getForm());

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledWith({
        file,
        label: 'A file',
        contentType: 'file',
      });
    });
  });
});
