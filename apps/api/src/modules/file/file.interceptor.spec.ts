import { of } from 'rxjs';

import { FileService, type StoredFile } from './file.service';
import { MultipartInterceptor, type MultipartRequest } from './file.interceptor';

type Part =
  | { type: 'field'; fieldname: string; value: unknown }
  | { type: 'file'; filename: string; mimetype: string };

function buildContext(request: Partial<MultipartRequest>) {
  const req = request as MultipartRequest;
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as never;
}

function multipartRequest(parts: Part[]): Partial<MultipartRequest> {
  return {
    headers: { 'content-type': 'multipart/form-data; boundary=x' },
    parts: async function* () {
      yield* parts;
    },
  } as Partial<MultipartRequest>;
}

const stored: StoredFile = {
  file_ref: 'uploads/abc-report.pdf',
  mime_type: 'application/pdf',
  size: 20480,
};

function buildInterceptor(store = jest.fn().mockResolvedValue(stored)) {
  const fileService = { store } as unknown as FileService;
  return { interceptor: new MultipartInterceptor(fileService), store };
}

const next = { handle: () => of('handled') };

describe('MultipartInterceptor', () => {
  it('passes non-multipart requests straight through', async () => {
    const { interceptor, store } = buildInterceptor();
    const request: Partial<MultipartRequest> = {
      headers: { 'content-type': 'application/json' },
      body: { content_type: 'text', label: 'L', value: 'hi' },
    };

    await interceptor.intercept(buildContext(request), next);

    expect(store).not.toHaveBeenCalled();
    expect(request.body).toEqual({
      content_type: 'text',
      label: 'L',
      value: 'hi',
    });
    expect(request.storedFile).toBeUndefined();
  });

  it('puts only the text fields on request.body and the descriptor aside', async () => {
    const { interceptor } = buildInterceptor();
    const request = multipartRequest([
      { type: 'field', fieldname: 'content_type', value: 'file' },
      { type: 'field', fieldname: 'label', value: 'Quarterly report' },
      { type: 'file', filename: 'report.pdf', mimetype: 'application/pdf' },
    ]);

    await interceptor.intercept(buildContext(request), next);

    expect(request.body).toEqual({
      content_type: 'file',
      label: 'Quarterly report',
    });
    expect(request.storedFile).toEqual(stored);
  });

  it('never lets a client-sent file_ref field reach request.body', async () => {
    const { interceptor } = buildInterceptor();
    const request = multipartRequest([
      { type: 'field', fieldname: 'content_type', value: 'file' },
      { type: 'field', fieldname: 'label', value: 'L' },
      { type: 'field', fieldname: 'file_ref', value: 'uploads/spoofed' },
      { type: 'file', filename: 'report.pdf', mimetype: 'application/pdf' },
    ]);

    await interceptor.intercept(buildContext(request), next);

    // The spoofed value lands in the raw body map (a stray text field), but the
    // real descriptor is the one the interceptor stored out of band, and the
    // DTO has no `file_ref` for the spoofed value to bind to.
    expect(request.storedFile).toEqual(stored);
  });

  it('leaves request.storedFile undefined when no file part is present', async () => {
    const { interceptor, store } = buildInterceptor();
    const request = multipartRequest([
      { type: 'field', fieldname: 'content_type', value: 'text' },
      { type: 'field', fieldname: 'label', value: 'L' },
      { type: 'field', fieldname: 'value', value: 'hi' },
    ]);

    await interceptor.intercept(buildContext(request), next);

    expect(store).not.toHaveBeenCalled();
    expect(request.storedFile).toBeUndefined();
    expect(request.body).toEqual({
      content_type: 'text',
      label: 'L',
      value: 'hi',
    });
  });
});
