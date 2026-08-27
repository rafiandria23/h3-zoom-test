import 'reflect-metadata';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

import { LogLevel, NodeEnv } from './common.constant';

// Default envelope for successful response payloads. `MD` types the `metadata`
// (pagination, counts, ...); `D` types the primary `data`.
export class SuccessTimestampDto<MD = unknown, D = unknown> {
  success = true;

  timestamp: Date = new Date();

  metadata?: MD;

  data?: D;

  constructor(partial: Partial<SuccessTimestampDto<MD, D>> = {}) {
    Object.assign(this, partial);
  }
}

// Schema for process environment variables. Fields are validated only when
// present; the config factories still supply defaults for anything unset.
export class EnvironmentVariables {
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
