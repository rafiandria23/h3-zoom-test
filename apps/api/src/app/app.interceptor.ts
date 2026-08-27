import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * Streams a `multipart/form-data` submission to disk and rebuilds `request.body`
 * as a plain object: text fields verbatim (the wire contract is snake_case, so
 * keys are not rewritten) plus `file_ref` / `mime_type` / `size` for the
 * uploaded file. Non-multipart requests pass straight through.
 *
 * No mimetype allowlist and no file size limit are enforced here or in the
 * `@fastify/multipart` registration.
 */
@Injectable()
export class MultipartInterceptor implements NestInterceptor {
  private uploadDirReady?: Promise<string>;

  private ensureUploadDir(): Promise<string> {
    this.uploadDirReady ??= mkdir(UPLOAD_DIR, { recursive: true }).then(
      () => UPLOAD_DIR,
    );

    return this.uploadDirReady;
  }

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
        const filename = `${randomUUID()}-${part.filename}`;
        const uploadDir = await this.ensureUploadDir();

        await pipeline(part.file, createWriteStream(join(uploadDir, filename)));

        fileRef = filename;
        mimeType = part.mimetype;
        size = part.file.bytesRead;
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
