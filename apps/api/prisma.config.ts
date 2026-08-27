import fs from 'node:fs';
import path from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

// --- env loading -----------------------------------------------------------
// dotenv-flow style cascade, all resolved from the workspace root so
// docker-compose and every app share the same files.
//
// `mode` follows NODE_ENV, so which mode file is picked is driven by the env:
//   NODE_ENV=development -> .env.development
//   NODE_ENV=dev         -> .env.dev
//   NODE_ENV=test        -> .env.test
//   NODE_ENV=testing     -> .env.testing
//
// Precedence (first file to define a var wins; real process.env always wins):
//   1. .env.<mode>.local
//   2. .env.local          (skipped for test-ish modes)
//   3. .env.<mode>
//   4. .env

function findWorkspaceRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'nx.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return start;
}

const workspaceRoot = findWorkspaceRoot(process.cwd());
const mode = process.env.NODE_ENV || 'development';
const isTestMode = mode === 'test' || mode === 'testing';

const envFiles = [
  `.env.${mode}.local`,
  isTestMode ? null : '.env.local',
  `.env.${mode}`,
  '.env',
].filter((file): file is string => file !== null);

for (const file of envFiles) {
  const fullPath = path.join(workspaceRoot, file);
  if (fs.existsSync(fullPath)) {
    // dotenv does not override already-set vars, so earlier files and the
    // real environment take precedence over later ones.
    expand(loadEnvFile({ path: fullPath, quiet: true }));
  }
}
// -------------------------------------------------------------------------

const port = Number.parseInt(env('DB_PORT'), 10);
if (Number.isNaN(port)) {
  throw new TypeError('Invalid DB_PORT');
}

const url =
  `postgresql://${encodeURIComponent(env('DB_USER'))}:${encodeURIComponent(env('DB_PASSWORD'))}` +
  `@${env('DB_HOST')}:${port}/${encodeURIComponent(env('DB_NAME'))}?schema=public`;

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema.prisma'),
  datasource: {
    url,
  },
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
});
