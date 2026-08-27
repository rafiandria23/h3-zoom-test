import { keysToCamel, keysToSnake } from './app.util';

describe('keysToCamel', () => {
  it('rewrites top-level keys', () => {
    expect(keysToCamel({ content_type: 'long_text', file_ref: 'a' })).toEqual({
      contentType: 'long_text',
      fileRef: 'a',
    });
  });

  it('recurses into nested objects and arrays', () => {
    expect(
      keysToCamel({ outer_key: [{ inner_key: 1 }, { inner_key: 2 }] }),
    ).toEqual({ outerKey: [{ innerKey: 1 }, { innerKey: 2 }] });
  });

  it('leaves string values untouched', () => {
    expect(keysToCamel({ label: 'Hello World' })).toEqual({
      label: 'Hello World',
    });
  });

  it('passes through Dates and primitives', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');

    expect(keysToCamel({ created_at: date, count: 3, done: false })).toEqual({
      createdAt: date,
      count: 3,
      done: false,
    });
  });
});

describe('keysToSnake', () => {
  it('rewrites keys recursively', () => {
    expect(keysToSnake({ contentType: 'longText', events: [{ occurredAt: 1 }] })).toEqual({
      content_type: 'longText',
      events: [{ occurred_at: 1 }],
    });
  });

  it('round-trips with keysToCamel', () => {
    const wire = { content_type: 'long_text', nested_obj: { some_field: [1, 2] } };

    expect(keysToSnake(keysToCamel(wire))).toEqual(wire);
  });
});
