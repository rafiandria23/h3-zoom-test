import {
  type CallHandler,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';

import { FileService, type StoredFile } from './file.service';

/** `FastifyRequest` carrying the descriptor extracted from the uploaded file part. */
export type MultipartRequest = FastifyRequest & { storedFile?: StoredFile };

/**
 * Streams a `multipart/form-data` submission to disk, then splits it in two:
 *
 * - text fields become `request.body`, verbatim — the wire contract is
 *   snake_case, so keys are not rewritten;
 * - the stored-file descriptor (`file_ref` / `mime_type` / `size`) is attached
 *   to `request.storedFile` for the `@StoredFileDescriptor()` param decorator.
 *
 * Keeping the descriptor off `request.body` keeps it out of DTO validation: it
 * is server-derived, so a client must not be able to supply or influence it.
 * Non-multipart requests pass straight through untouched.
 */
@Injectable()
export class MultipartInterceptor implements NestInterceptor {
  constructor(private readonly fileService: FileService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<MultipartRequest>();
    const contentType = request.headers['content-type'] ?? '';

    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }

    const fields: Record<string, unknown> = {};
    let storedFile: StoredFile | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        storedFile = await this.fileService.store(part);
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    request.body = fields;
    request.storedFile = storedFile;

    return next.handle();
  }
}

/**
 * Resolves to the stored-file descriptor `MultipartInterceptor` extracted from a
 * `multipart/form-data` upload, or `{}` for a JSON submission.
 */
export const StoredFileDescriptor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Partial<StoredFile> => {
    const request = context.switchToHttp().getRequest<MultipartRequest>();

    return request.storedFile ?? {};
  },
);
