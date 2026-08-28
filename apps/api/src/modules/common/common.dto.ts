import 'reflect-metadata';

import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import {
  LogLevel,
  NodeEnv,
  PaginationPage,
  PaginationSize,
  SortDirection,
  WebScheme,
} from './common.constant';

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

// --- list endpoint query params + response metadata ------------------------

/**
 * Reusable `?page=&size=` query params for paginated list endpoints. Values
 * arrive as strings on the query string; `TransformType` coerces them to
 * numbers before validation, and the app-wide `ValidationPipe` (`transform:
 * true`) fills in the defaults when a param is omitted.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: PaginationPage.Min,
    default: PaginationPage.Min,
    description: '1-based page number.',
  })
  @IsOptional()
  @TransformType(() => Number)
  @IsInt()
  @Min(PaginationPage.Min)
  page: number = PaginationPage.Min;

  @ApiPropertyOptional({
    type: Number,
    minimum: PaginationSize.Min,
    maximum: PaginationSize.Max,
    default: PaginationSize.Default,
    description: 'Rows per page.',
  })
  @IsOptional()
  @TransformType(() => Number)
  @IsInt()
  @Min(PaginationSize.Min)
  @Max(PaginationSize.Max)
  size: number = PaginationSize.Default;
}

// `metadata.pagination` for paginated list endpoints. `total` is the number of
// rows on the returned page (0 once the requested page is past the end), not a
// grand count of all matching rows.
export class PaginationInfoDto {
  @ApiProperty({ type: Number, example: PaginationPage.Min })
  page!: number;

  @ApiProperty({ type: Number, example: PaginationSize.Default })
  size!: number;

  @ApiProperty({ type: Number, example: PaginationSize.Default })
  total!: number;
}

// `metadata.sort` — the sort actually applied to the returned page.
export class SortInfoDto {
  @ApiProperty({ type: String, example: 'created_at' })
  by!: string;

  @ApiProperty({ enum: SortDirection, enumName: 'SortDirection' })
  direction!: SortDirection;
}

// `metadata` shape for paginated, sortable list endpoints.
export class PaginationMetadataDto {
  @ApiProperty({ type: PaginationInfoDto })
  pagination!: PaginationInfoDto;

  @ApiProperty({ type: SortInfoDto })
  sort!: SortInfoDto;
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
