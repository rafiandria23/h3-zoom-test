import path from 'node:path';

import { resolveEnvFilePaths, validateEnv } from './common.util';

describe('resolveEnvFilePaths', () => {
  const root = path.resolve(__dirname, '..', '..', '..', '..', '..');

  it('builds the development cascade by default', () => {
    expect(resolveEnvFilePaths(__dirname, 'development')).toEqual([
      path.join(root, '.env.development.local'),
      path.join(root, '.env.local'),
      path.join(root, '.env.development'),
      path.join(root, '.env'),
    ]);
  });

  it('honours an arbitrary mode name', () => {
    expect(resolveEnvFilePaths(__dirname, 'dev')).toEqual([
      path.join(root, '.env.dev.local'),
      path.join(root, '.env.local'),
      path.join(root, '.env.dev'),
      path.join(root, '.env'),
    ]);
  });

  it.each(['test', 'testing'])('skips .env.local for %s mode', (mode) => {
    expect(resolveEnvFilePaths(__dirname, mode)).toEqual([
      path.join(root, `.env.${mode}.local`),
      path.join(root, `.env.${mode}`),
      path.join(root, '.env'),
    ]);
  });

  it('resolves the workspace root from a nested cwd', () => {
    const paths = resolveEnvFilePaths(
      path.join(root, 'apps', 'api', 'src', 'app'),
      'development',
    );

    expect(paths.every((p) => p === path.join(root, path.basename(p)))).toBe(
      true,
    );
  });
});

describe('validateEnv', () => {
  it('passes for a well-formed environment', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
        API_PORT: '3000',
        WEB_SCHEME: 'http',
        WEB_HOST: '127.0.0.1',
        WEB_PORT: '4000',
        DB_PORT: '5432',
        REDIS_DB_INDEX: '0',
      }),
    ).not.toThrow();
  });

  it('passes for an empty environment (factories supply defaults)', () => {
    expect(() => validateEnv({})).not.toThrow();
  });

  it('coerces numeric strings to numbers', () => {
    const result = validateEnv({ DB_PORT: '5432' });

    expect(result.DB_PORT).toBe(5432);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'prod' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnv({ DB_PORT: '99999' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects a non-numeric port', () => {
    expect(() => validateEnv({ API_PORT: 'abc' })).toThrow(
      /Invalid environment variables/,
    );
  });
});
