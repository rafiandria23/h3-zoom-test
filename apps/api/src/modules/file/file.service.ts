import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { Injectable } from '@nestjs/common';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

/** Structural view of a `@fastify/multipart` file part — all this service needs. */
export interface UploadPart {
  filename: string;
  mimetype: string;
  file: NodeJS.ReadableStream & { bytesRead: number };
}

export interface StoredFile {
  file_ref: string;
  mime_type: string;
  size: number;
}

/**
 * Streams uploaded parts to disk under `<cwd>/uploads`.
 *
 * No mimetype allowlist and no file size limit are enforced here or in the
 * `@fastify/multipart` registration.
 */
@Injectable()
export class FileService {
  private uploadDirReady?: Promise<string>;

  private ensureUploadDir(): Promise<string> {
    this.uploadDirReady ??= mkdir(UPLOAD_DIR, { recursive: true }).then(
      () => UPLOAD_DIR,
    );

    return this.uploadDirReady;
  }

  public async store(part: UploadPart): Promise<StoredFile> {
    const filename = `${randomUUID()}-${part.filename}`;
    const uploadDir = await this.ensureUploadDir();

    await pipeline(part.file, createWriteStream(join(uploadDir, filename)));

    return {
      file_ref: filename,
      mime_type: part.mimetype,
      size: part.file.bytesRead,
    };
  }
}
