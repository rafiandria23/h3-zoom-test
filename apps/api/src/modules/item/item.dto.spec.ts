import { ValidationPipe } from '@nestjs/common';

import { SubmitItemDto } from './item.dto';

describe('SubmitItemDto (via the app-wide ValidationPipe)', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: true,
  });
  const meta = {
    type: 'body',
    metatype: SubmitItemDto,
    data: '',
  } as never;

  const transform = (body: unknown) => pipe.transform(body, meta);

  it('accepts a text submission and keeps the value a string', async () => {
    await expect(
      transform({ content_type: 'text', label: 'L', value: 'Some text' }),
    ).resolves.toMatchObject({ content_type: 'text', value: 'Some text' });
  });

  it('accepts a long_text submission and keeps the value a string', async () => {
    await expect(
      transform({
        content_type: 'long_text',
        label: 'L',
        value: 'A longer piece of text',
      }),
    ).resolves.toMatchObject({ value: 'A longer piece of text' });
  });

  it('accepts a numeric submission with a numeric value', async () => {
    await expect(
      transform({ content_type: 'numeric', label: 'L', value: 42 }),
    ).resolves.toMatchObject({ value: 42 });
  });

  it('accepts a file submission with no value', async () => {
    await expect(
      transform({
        content_type: 'file',
        label: 'L',
        file_ref: 's3://bucket/key',
        mime_type: 'application/pdf',
        size: 20480,
      }),
    ).resolves.toMatchObject({ file_ref: 's3://bucket/key', size: 20480 });
  });

  it('rejects a numeric submission whose value is not a number', async () => {
    await expect(
      transform({ content_type: 'numeric', label: 'L', value: 'not-a-number' }),
    ).rejects.toThrow();
  });

  it('rejects a text submission with an empty value', async () => {
    await expect(
      transform({ content_type: 'text', label: 'L', value: '   ' }),
    ).rejects.toThrow();
  });

  it('rejects a submission with no label', async () => {
    await expect(
      transform({ content_type: 'text', value: 'Some text' }),
    ).rejects.toThrow();
  });
});
