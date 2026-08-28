'use client';

import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api, type ContentType } from '@rafiandria23/h3-zoom-test-api-client';

import type { AppDispatch } from '@/redux';

// API origin. Mirrors the fallback in the api-client base query and
// `use-item-events` (`NEXT_PUBLIC_API_URL` is inlined by Next at build time).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadItemArgs {
  file: File;
  label: string;
  contentType: ContentType;
}

export interface UseItemUpload {
  /** Starts the upload; resolves on a 2xx response, rejects otherwise. */
  upload: (args: UploadItemArgs) => Promise<void>;
  /** Aborts an in-flight upload (no-op when idle). */
  abort: () => void;
  /** Aborts and clears progress/status back to `idle`. */
  reset: () => void;
  /** 0–100. */
  progress: number;
  status: UploadStatus;
  isUploading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Uploads a `file` item to `POST /api/v1/items` as `multipart/form-data` while
 * tracking real upload progress.
 *
 * RTK Query's `fetchBaseQuery` (fetch) exposes no upload progress, so this goes
 * through `XMLHttpRequest` directly. On success it invalidates the `items` tag
 * so the cached list refetches — matching `itemControllerSubmit`'s
 * `invalidatesTags`.
 */
export function useItemUpload(): UseItemUpload {
  const dispatch = useDispatch<AppDispatch>();
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);

  const abort = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setStatus('idle');
    setProgress(0);
  }, [abort]);

  const upload = useCallback(
    ({ file, label, contentType }: UploadItemArgs) =>
      new Promise<void>((resolve, reject) => {
        const body = new FormData();
        body.append('content_type', contentType);
        body.append('label', label);
        body.append('file', file);

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open('POST', `${API_URL}/api/v1/items`);
        xhr.withCredentials = true;

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          xhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            setStatus('success');
            dispatch(api.util.invalidateTags(['items']));
            resolve();
          } else {
            setStatus('error');
            reject(new Error(`Upload failed (HTTP ${xhr.status})`));
          }
        });

        xhr.addEventListener('error', () => {
          xhrRef.current = null;
          setStatus('error');
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          xhrRef.current = null;
          setStatus('idle');
          setProgress(0);
          const aborted = new Error('Upload aborted');
          aborted.name = 'AbortError';
          reject(aborted);
        });

        setStatus('uploading');
        setProgress(0);
        xhr.send(body);
      }),
    [dispatch],
  );

  return {
    upload,
    abort,
    reset,
    progress,
    status,
    isUploading: status === 'uploading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
