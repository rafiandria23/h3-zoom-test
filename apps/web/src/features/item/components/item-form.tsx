'use client';

import { type SyntheticEvent, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Select,
  Spinner,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  useItemControllerSubmitMutation,
  type ContentType,
  type SubmitItemDto,
} from '@rafiandria23/h3-zoom-test-api-client';

// Selectable content types, mirroring the `ContentType` enum in apps/api
// (prisma schema / item.dto.ts).
const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'file', label: 'File' },
];

// Dynamic create form. The fields shown depend on `content_type`, mirroring
// `SubmitItemDto` / `IsValidValueForContentType` in apps/api.
export function ItemForm() {
  const [contentType, setContentType] = useState<ContentType>('text');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [fileRef, setFileRef] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [size, setSize] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [submit, { isLoading, isSuccess, isError }] =
    useItemControllerSubmitMutation();

  const isText = contentType === 'text' || contentType === 'long_text';
  const isNumeric = contentType === 'numeric';
  const isFile = contentType === 'file';

  function resetValueFields() {
    setValue('');
    setFileRef('');
    setMimeType('');
    setSize('');
  }

  function validate(): string | null {
    if (!label.trim()) {
      return 'Label is required.';
    }
    if (isText && !value.trim()) {
      return 'Value is required for text content.';
    }
    if (isNumeric && (value.trim() === '' || Number.isNaN(Number(value)))) {
      return 'Value must be a number.';
    }
    return null;
  }

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setFormError(null);

    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    const dto: SubmitItemDto = { content_type: contentType, label: label.trim() };

    if (isNumeric) {
      dto.value = Number(value);
    } else if (isText) {
      dto.value = value;
    } else {
      if (fileRef.trim()) dto.file_ref = fileRef.trim();
      if (mimeType.trim()) dto.mime_type = mimeType.trim();
      if (size.trim() && !Number.isNaN(Number(size))) dto.size = Number(size);
    }

    try {
      await submit({ submitItemDto: dto }).unwrap();
      setLabel('');
      resetValueFields();
    } catch {
      // Surfaced via `isError` below.
    }
  }

  return (
    <Card size="3" asChild>
      <form onSubmit={onSubmit}>
        <Flex direction="column" gap="4">
          <Heading size="4">Create item</Heading>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Content type
            </Text>
            <Select.Root
              value={contentType}
              onValueChange={(next) => {
                setContentType(next as ContentType);
                setFormError(null);
                resetValueFields();
              }}
            >
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content>
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Label
            </Text>
            <TextField.Root
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Quarterly report"
            />
          </label>

          {contentType === 'text' && (
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Value
              </Text>
              <TextField.Root
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Some text"
              />
            </label>
          )}

          {contentType === 'long_text' && (
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Value
              </Text>
              <TextArea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="A longer piece of text"
                rows={4}
              />
            </label>
          )}

          {isNumeric && (
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Value
              </Text>
              <TextField.Root
                type="number"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="42"
              />
            </label>
          )}

          {isFile && (
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  File ref
                </Text>
                <TextField.Root
                  value={fileRef}
                  onChange={(event) => setFileRef(event.target.value)}
                  placeholder="s3://bucket/key"
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  MIME type
                </Text>
                <TextField.Root
                  value={mimeType}
                  onChange={(event) => setMimeType(event.target.value)}
                  placeholder="application/pdf"
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Size (bytes)
                </Text>
                <TextField.Root
                  type="number"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  placeholder="20480"
                />
              </label>
            </Flex>
          )}

          {formError && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{formError}</Callout.Text>
            </Callout.Root>
          )}

          {isError && (
            <Callout.Root color="red" size="1">
              <Callout.Text>Failed to submit item. Try again.</Callout.Text>
            </Callout.Root>
          )}

          {isSuccess && !isError && (
            <Callout.Root color="green" size="1">
              <Callout.Text>Item submitted for processing.</Callout.Text>
            </Callout.Root>
          )}

          <Button type="submit" disabled={isLoading}>
            <Spinner loading={isLoading} />
            Submit
          </Button>
        </Flex>
      </form>
    </Card>
  );
}
