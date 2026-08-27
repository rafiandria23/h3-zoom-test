import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

import { FileService } from './file.service';

/**
 * Streams a `multipart/form-data` submission to disk and rebuilds `request.body`
 * as a plain object: text fields verbatim (the wire contract is snake_case, so
 * keys are not rewritten) plus `file_ref` / `mime_type` / `size` for the
 * uploaded file. Non-multipart requests pass straight through.
 */
@Injectable()
export class MultipartInterceptor implements NestInterceptor {
  constructor(private readonly fileService: FileService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const contentType = request.headers['content-type'] ?? '';

    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }

    const fields: Record<string, unknown> = {};
    let fileRef: string | undefined;
    let mimeType: string | undefined;
    let size: number | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const stored = await this.fileService.store(part);

        fileRef = stored.file_ref;
        mimeType = stored.mime_type;
        size = stored.size;
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    request.body = {
      ...fields,
      file_ref: fileRef,
      mime_type: mimeType,
      size,
    };

    return next.handle();
  }
}
