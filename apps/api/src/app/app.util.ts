import { camelCase, isPlainObject, snakeCase } from 'lodash';

type KeyTransformer = (key: string) => string;

function convertKeys(value: unknown, transform: KeyTransformer): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, transform));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        transform(key),
        convertKeys(val, transform),
      ]),
    );
  }

  // Dates, Buffers, streams, class instances and primitives pass through untouched.
  return value;
}

/** Recursively rewrite object keys to camelCase (wire snake_case -> runtime). */
export const keysToCamel = (value: unknown): unknown =>
  convertKeys(value, camelCase);

/** Recursively rewrite object keys to snake_case (runtime -> wire). */
export const keysToSnake = (value: unknown): unknown =>
  convertKeys(value, snakeCase);
