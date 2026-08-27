import 'reflect-metadata';

import fs from 'node:fs';
import path from 'node:path';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EnvironmentVariables } from './common.dto';

// --- env file resolution -------------------------------------------------
// dotenv-flow style cascade, resolved from the workspace root so that
// docker-compose and every app share the same files. Mirrors the loader in
// apps/api/prisma.config.ts. `mode` follows NODE_ENV:
//   NODE_ENV=development -> .env.development
//   NODE_ENV=test        -> .env.test   (and so on for dev / testing / ...)
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

export function resolveEnvFilePaths(
  cwd: string = process.cwd(),
  mode: string = process.env.NODE_ENV || 'development',
): string[] {
  const root = findWorkspaceRoot(cwd);
  const isTestMode = mode === 'test' || mode === 'testing';

  return [
    `.env.${mode}.local`,
    isTestMode ? null : '.env.local',
    `.env.${mode}`,
    '.env',
  ]
    .filter((file): file is string => file !== null)
    .map((file) => path.join(root, file));
}

export const envFilePaths = resolveEnvFilePaths();

// --- env validation ----------------------------------------------------------
// Validates variables when present against `EnvironmentVariables`; the config
// factories still supply defaults for anything unset.

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
