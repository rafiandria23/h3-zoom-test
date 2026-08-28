'use client';

import { type SyntheticEvent, useRef, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Progress,
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

import { useItemUpload } from '../hooks/use-item-upload';

// Human-readable byte size for the selected-file summary.
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

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
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submit, { isLoading, isSuccess, isError }] =
    useItemControllerSubmitMutation();

  const {
    upload: uploadFile,
    reset: resetUpload,
    progress: uploadProgress,
    isUploading,
    isSuccess: uploadSucceeded,
    isError: uploadFailed,
  } = useItemUpload();

  const isText = contentType === 'text' || contentType === 'long_text';
  const isNumeric = contentType === 'numeric';
  const isFile = contentType === 'file';

  const busy = isLoading || isUploading;
  const failed = isError || uploadFailed;
  const succeeded = isSuccess || uploadSucceeded;

  function resetValueFields() {
    setValue('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resetUpload();
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
    if (isFile && !file) {
      return 'Choose a file to upload.';
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

    // File items are streamed as `multipart/form-data` so upload progress can
    // be reported; every other content type goes through the JSON mutation.
    if (isFile) {
      if (!file) {
        return;
      }
      try {
        await uploadFile({ file, label: label.trim(), contentType });
        // Keep the `success` status (and its callout) — only clear the inputs.
        setLabel('');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Surfaced via `uploadFailed` below.
      }
      return;
    }

    const dto: SubmitItemDto = { content_type: contentType, label: label.trim() };
    dto.value = isNumeric ? Number(value) : value;

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
            <Flex direction="column" gap="2">
              <Text as="div" size="2" weight="medium">
                File
              </Text>
              <input
                ref={fileInputRef}
                type="file"
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setFormError(null);
                  resetUpload();
                }}
              />
              {file && (
                <Text size="1" color="gray">
                  {file.name} · {formatBytes(file.size)}
                </Text>
              )}
              {isUploading && (
                <Flex direction="column" gap="1" mt="1">
                  <Progress value={uploadProgress} />
                  <Text size="1" color="gray">
                    Uploading… {uploadProgress}%
                  </Text>
                </Flex>
              )}
            </Flex>
          )}

          {formError && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{formError}</Callout.Text>
            </Callout.Root>
          )}

          {failed && (
            <Callout.Root color="red" size="1">
              <Callout.Text>Failed to submit item. Try again.</Callout.Text>
            </Callout.Root>
          )}

          {succeeded && !failed && (
            <Callout.Root color="green" size="1">
              <Callout.Text>Item submitted for processing.</Callout.Text>
            </Callout.Root>
          )}

          <Button type="submit" disabled={busy}>
            <Spinner loading={busy} />
            {isUploading ? 'Uploading…' : 'Submit'}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}
