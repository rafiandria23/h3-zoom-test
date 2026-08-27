import {
  IsEnum,
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ContentType } from '../../generated/prisma/enums';

export class SubmitItemDto {
  @IsEnum(ContentType)
  content_type!: ContentType;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @Type(() => Number)
  @IsValidValueForContentType()
  value?: string | number;

  // Populated by the MultipartInterceptor for `multipart/form-data` submissions.
  @IsOptional()
  @IsString()
  file_ref?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  size?: number;
}

export type CreateItemInput = SubmitItemDto;

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
