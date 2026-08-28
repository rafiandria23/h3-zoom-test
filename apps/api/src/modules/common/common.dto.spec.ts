import { ValidationPipe } from '@nestjs/common';

import { PaginationPage, PaginationSize } from './common.constant';
import { PaginationQueryDto } from './common.dto';

describe('PaginationQueryDto (via the app-wide ValidationPipe)', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: true,
  });
  const meta = {
    type: 'query',
    metatype: PaginationQueryDto,
    data: '',
  } as never;

  const transform = (query: unknown) => pipe.transform(query, meta);

  it('fills in defaults when page/size are omitted', async () => {
    await expect(transform({})).resolves.toEqual({
      page: PaginationPage.Min,
      size: PaginationSize.Default,
    });
  });

  it('coerces numeric strings from the query string', async () => {
    await expect(transform({ page: '3', size: '25' })).resolves.toEqual({
      page: 3,
      size: 25,
    });
  });

  it('accepts size at the maximum bound', async () => {
    await expect(
      transform({ size: String(PaginationSize.Max) }),
    ).resolves.toMatchObject({ size: PaginationSize.Max });
  });

  it('rejects a page below the minimum', async () => {
    await expect(transform({ page: '0' })).rejects.toThrow();
  });

  it('rejects a size below the minimum', async () => {
    await expect(transform({ size: '0' })).rejects.toThrow();
  });

  it('rejects a size above the maximum', async () => {
    await expect(
      transform({ size: String(PaginationSize.Max + 1) }),
    ).rejects.toThrow();
  });

  it('rejects a non-integer page', async () => {
    await expect(transform({ page: '1.5' })).rejects.toThrow();
  });
});
