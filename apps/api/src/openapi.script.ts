import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app/app.module';
import { buildOpenApiDocument } from './openapi';

// Emits apps/api/openapi.json without booting the app. Nest "preview" mode
// builds the module/route graph but instantiates no providers and runs no
// lifecycle hooks, so no Postgres or Redis connection is required — this can
// run in CI or offline. Keep the global prefix in sync with main.ts so the
// emitted paths match the served API. Run via `nx openapi` (cwd: apps/api).
const OUT_PATH = join(process.cwd(), 'openapi.json');
const GLOBAL_PREFIX = '/api/v1';

async function emit(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { preview: true, logger: false },
  );
  app.setGlobalPrefix(GLOBAL_PREFIX);

  const document = buildOpenApiDocument(app);
  writeFileSync(OUT_PATH, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  process.stdout.write(`openapi.json written (${OUT_PATH})\n`);
}

emit().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
