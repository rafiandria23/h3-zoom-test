import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { camelCase } from 'lodash';

import { ContentType } from '../prisma/client/enums';

export class SubmitItemDto {
  @IsEnum(ContentType)
  @Transform(({ value }) =>
    typeof value === 'string' ? camelCase(value) : value,
  )
  contentType!: ContentType;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @Type(() => Number)
  @IsValidValueForContentType()
  value?: string | number;
}

export interface CreateItemInput extends SubmitItemDto {
  fileRef?: string;
  mimeType?: string;
  size?: number;
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
          const { contentType } = args.object as SubmitItemDto;

          if (
            contentType === ContentType.text ||
            contentType === ContentType.longText
          ) {
            return typeof value === 'string' && value.trim().length > 0;
          }

          if (contentType === ContentType.numeric) {
            return typeof value === 'number' && !Number.isNaN(value);
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const { contentType } = args.object as SubmitItemDto;

          return `value is invalid for contentType "${contentType}"`;
        },
      },
    });
  };
}
