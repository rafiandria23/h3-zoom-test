import fs from 'node:fs';
import path from 'node:path';

import _ from 'lodash';
import { registerAs } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

import { LogLevel, NodeEnv, RADIX } from './app.constant';

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
// Validates variables when present; the factories below still supply defaults
// for anything unset.

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsEnum(LogLevel)
  LOG_LEVEL?: LogLevel;

  @IsOptional()
  @IsString()
  API_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  WEB_URL?: string;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT?: number;

  @IsOptional()
  @IsString()
  DB_USER?: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DB_NAME?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_USER?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  REDIS_DB_INDEX?: number;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
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

// --- namespaced config -----------------------------------------------------

export const apiConfig = registerAs('api', () => {
  const host = _.get(process, 'env.API_HOST', '127.0.0.1');

  const port = Number.parseInt(_.get(process, 'env.API_PORT', '3000'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid API_PORT');
  }

  const webUrl = _.get(process, 'env.WEB_URL', 'http://127.0.0.1:4000');

  return {
    host,
    port,
    webUrl,
  };
});

export const dbConfig = registerAs('db', () => {
  const host = _.get(process, 'env.DB_HOST', '127.0.0.1');
  const port = Number.parseInt(_.get(process, 'env.DB_PORT', '5432'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid DB_PORT');
  }

  const user = _.get(process, 'env.DB_USER', 'rafiandria23');
  const password = _.get(process, 'env.DB_PASSWORD', 'rafiandria23');
  const name = _.get(process, 'env.DB_NAME', 'h3_zoom_test');

  return {
    host,
    port,
    user,
    password,
    name,
  };
});

export const redisConfig = registerAs('redis', () => {
  const host = _.get(process, 'env.REDIS_HOST', '127.0.0.1');
  const port = Number.parseInt(_.get(process, 'env.REDIS_PORT', '6379'), RADIX);
  if (Number.isNaN(port)) {
    throw new TypeError('Invalid REDIS_PORT');
  }

  const user = _.get(process, 'env.REDIS_USER', 'rafiandria23');
  const password = _.get(process, 'env.REDIS_PASSWORD', 'rafiandria23');
  const dbIndex = Number.parseInt(
    _.get(process, 'env.REDIS_DB_INDEX', '0'),
    RADIX,
  );
  if (Number.isNaN(dbIndex)) {
    throw new TypeError('Invalid REDIS_DB_INDEX');
  }

  return {
    host,
    port,
    user,
    password,
    dbIndex,
  };
});
