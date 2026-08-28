import 'reflect-metadata';

import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { LogLevel, NodeEnv, WebScheme } from './common.constant';

// Default envelope for successful response payloads. `MD` types the `metadata`
// (pagination, counts, ...); `D` types the primary `data`.
//
// `metadata`/`data` are intentionally left off the OpenAPI schema here; the
// `ApiSuccessResponse` helper below composes them per-endpoint via `allOf`.
export class SuccessTimestampDto<MD = unknown, D = unknown> {
  @ApiProperty({ type: Boolean, example: true })
  success = true;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: Date = new Date();

  metadata?: MD;

  data?: D;

  constructor(partial: Partial<SuccessTimestampDto<MD, D>> = {}) {
    Object.assign(this, partial);
  }
}

// `metadata` shape for list endpoints that only report a row count.
export class CountMetadataDto {
  @ApiProperty({ type: Number, example: 3 })
  count!: number;
}

interface ApiSuccessResponseOptions {
  /** Describe `data` as an array of `model` rather than a single object. */
  isArray?: boolean;
  /** Model for the `metadata` field, when the endpoint populates it. */
  metadata?: Type<unknown>;
  description?: string;
}

/**
 * Documents a 200 response as the `SuccessTimestampDto` envelope with `data`
 * (and optionally `metadata`) narrowed to concrete models. Keeps the generic
 * envelope generic in code while still emitting precise OpenAPI schemas.
 */
export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ApiSuccessResponseOptions = {},
) {
  const dataSchema = options.isArray
    ? { type: 'array' as const, items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  const extraModels = options.metadata
    ? [SuccessTimestampDto, model, options.metadata]
    : [SuccessTimestampDto, model];

  return applyDecorators(
    ApiExtraModels(...extraModels),
    ApiOkResponse({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessTimestampDto) },
          {
            properties: {
              data: dataSchema,
              ...(options.metadata
                ? { metadata: { $ref: getSchemaPath(options.metadata) } }
                : {}),
            },
          },
        ],
      },
    }),
  );
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
  @IsEnum(WebScheme)
  WEB_SCHEME?: WebScheme;

  @IsOptional()
  @IsString()
  WEB_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  WEB_PORT?: number;

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
