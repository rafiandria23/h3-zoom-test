import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaginationQueryDto, SortDirection } from '../common';
import { ContentType } from '../../generated/prisma/enums';

// Processing status derived from the item's event log.
export enum ItemStatus {
  Pending = 'pending',
  Done = 'done',
}

// Columns `GET /items` allows sorting on.
export enum ItemSortField {
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
  Label = 'label',
}

// Query params for `GET /items`: `page`/`size` (inherited) plus the
// item-specific `sort_by` whitelist and shared `sort_direction`.
export class ListItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ItemSortField,
    enumName: 'ItemSortField',
    default: ItemSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(ItemSortField)
  sort_by: ItemSortField = ItemSortField.CreatedAt;

  @ApiPropertyOptional({
    enum: SortDirection,
    enumName: 'SortDirection',
    default: SortDirection.Asc,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sort_direction: SortDirection = SortDirection.Asc;
}

export class SubmitItemDto {
  @ApiProperty({ enum: ContentType, enumName: 'ContentType' })
  @IsEnum(ContentType)
  content_type!: ContentType;

  @ApiProperty({ type: String, example: 'Quarterly report' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    description:
      'Required for text/long_text (string) and numeric (number); omitted for file.',
  })
  // No `@Type()` coercion here: `value` is legitimately a string or a number,
  // and the wire format (JSON) already carries that distinction. The custom
  // validator below is what enforces the right runtime type per `content_type`.
  @IsOptional()
  @IsValidValueForContentType()
  value?: string | number;

  // Populated by the MultipartInterceptor for `multipart/form-data` submissions.
  // TODO(refactor): the raw multipart request carries a binary `file` part, not
  // these fields — model that separately once the upload contract is firmed up.
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  file_ref?: string;

  @ApiPropertyOptional({ type: String, example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({ type: Number, example: 20480 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  size?: number;
}

export type CreateItemInput = SubmitItemDto;

// A persisted `items` row, as returned by `POST /items`.
export class ItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ContentType, enumName: 'ContentType' })
  content_type!: ContentType;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    nullable: true,
  })
  value!: string | number | null;

  @ApiProperty({ type: String, nullable: true })
  file_ref!: string | null;

  @ApiProperty({ type: String, nullable: true })
  mime_type!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  size!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deleted_at!: Date | null;
}

// Result payload written by the worker once an item is processed.
export class ItemResultDto {
  @ApiProperty({ type: Number, example: 87 })
  score!: number;
}

// One row of `GET /items`. Mirrors the shape assembled in
// `ItemService.listItems`; keep the two in sync.
export class ItemListEntryDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ContentType, enumName: 'ContentType' })
  content_type!: ContentType;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    nullable: true,
  })
  value!: string | number | null;

  @ApiProperty({ type: String, nullable: true })
  file_ref!: string | null;

  @ApiProperty({ type: String, nullable: true })
  mime_type!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  size!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ enum: ItemStatus, enumName: 'ItemStatus' })
  status!: ItemStatus;

  @ApiProperty({ type: ItemResultDto, nullable: true })
  result!: ItemResultDto | null;
}

export function IsValidValueForContentType(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidValueForContentType',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { content_type } = args.object as SubmitItemDto;

          if (
            content_type === ContentType.text ||
            content_type === ContentType.long_text
          ) {
            return typeof value === 'string' && value.trim().length > 0;
          }

          if (content_type === ContentType.numeric) {
            return typeof value === 'number' && !Number.isNaN(value);
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const { content_type } = args.object as SubmitItemDto;

          return `value is invalid for content_type "${content_type}"`;
        },
      },
    });
  };
}
