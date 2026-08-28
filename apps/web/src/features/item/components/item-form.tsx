'use client';

import {
  type FC,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

import styles from './item-form.module.scss';

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

// Client-side schema for the form. The per-`content_type` rules on `value` /
// `file` mirror `IsValidValueForContentType` in apps/api (item.dto.ts); the
// fields not relevant to the selected type are simply left unvalidated.
const itemFormSchema = z
  .object({
    content_type: z.enum(['text', 'long_text', 'numeric', 'file']),
    label: z.string().trim().min(1, 'Label is required.'),
    // Kept as a string in form state (a `type=number` input still yields a
    // string); coerced to a number on submit for the numeric case.
    value: z.string(),
    file: z.instanceof(File).nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.content_type === 'text' || data.content_type === 'long_text') {
      if (data.value.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Value is required for text content.',
        });
      }
    }

    if (data.content_type === 'numeric') {
      if (data.value.trim() === '' || Number.isNaN(Number(data.value))) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Value must be a number.',
        });
      }
    }

    if (data.content_type === 'file' && !(data.file instanceof File)) {
      ctx.addIssue({
        code: 'custom',
        path: ['file'],
        message: 'Choose a file to upload.',
      });
    }
  });

type ItemFormValues = z.infer<typeof itemFormSchema>;

const DEFAULT_VALUES: ItemFormValues = {
  content_type: 'text',
  label: '',
  value: '',
  file: null,
};

// Field label with a red asterisk marking it as required.
const RequiredLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <Text as="div" size="2" mb="1" weight="medium">
    {children}
    <span className={styles.required} aria-hidden>
      *
    </span>
  </Text>
);

// Dynamic create form. The fields shown depend on `content_type`, mirroring
// `SubmitItemDto` / `IsValidValueForContentType` in apps/api.
export const ItemForm: FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const contentType = watch('content_type');
  const file = watch('file');

  const isNumeric = contentType === 'numeric';
  const isFile = contentType === 'file';

  const busy = isLoading || isUploading || isSubmitting;
  const failed = isError || uploadFailed;
  const succeeded = isSuccess || uploadSucceeded;

  // Clear the type-specific fields (and any upload state) when the content type
  // changes, so a stale value/file can't be submitted under the new type.
  function resetValueFields() {
    setValue('value', '');
    setValue('file', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    clearErrors(['value', 'file']);
    resetUpload();
  }

  function acceptFile(next: File | null) {
    setValue('file', next, { shouldValidate: true });
    resetUpload();
  }

  function openFilePicker() {
    if (!busy) {
      fileInputRef.current?.click();
    }
  }

  function onDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!busy) {
      setDragging(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) {
      return;
    }
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      acceptFile(dropped);
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    // File items are streamed as `multipart/form-data` so upload progress can
    // be reported; every other content type goes through the JSON mutation.
    if (data.content_type === 'file') {
      if (!data.file) {
        return;
      }
      try {
        await uploadFile({
          file: data.file,
          label: data.label.trim(),
          contentType: data.content_type,
        });
        // Keep the `success` status (and its callout) — only clear the inputs.
        reset({ ...DEFAULT_VALUES, content_type: 'file' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Surfaced via `uploadFailed` below.
      }
      return;
    }

    const dto: SubmitItemDto = {
      content_type: data.content_type,
      label: data.label.trim(),
    };
    dto.value =
      data.content_type === 'numeric' ? Number(data.value) : data.value;

    try {
      await submit({ submitItemDto: dto }).unwrap();
      reset({ ...DEFAULT_VALUES, content_type: data.content_type });
      resetUpload();
    } catch {
      // Surfaced via `isError` below.
    }
  });

  return (
    <Card size="3" asChild>
      <form onSubmit={onSubmit} noValidate>
        <Flex direction="column" gap="4">
          <Heading size="4">Create item</Heading>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Content type
            </Text>
            <Controller
              control={control}
              name="content_type"
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next as ContentType);
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
              )}
            />
          </label>

          <label>
            <RequiredLabel>Label</RequiredLabel>
            <TextField.Root
              {...register('label')}
              placeholder="Quarterly report"
            />
            {errors.label && (
              <Text as="div" size="1" color="red" mt="1">
                {errors.label.message}
              </Text>
            )}
          </label>

          {contentType === 'text' && (
            <label>
              <RequiredLabel>Value</RequiredLabel>
              <TextField.Root {...register('value')} placeholder="Some text" />
              {errors.value && (
                <Text as="div" size="1" color="red" mt="1">
                  {errors.value.message}
                </Text>
              )}
            </label>
          )}

          {contentType === 'long_text' && (
            <label>
              <RequiredLabel>Value</RequiredLabel>
              <TextArea
                {...register('value')}
                placeholder="A longer piece of text"
                rows={4}
              />
              {errors.value && (
                <Text as="div" size="1" color="red" mt="1">
                  {errors.value.message}
                </Text>
              )}
            </label>
          )}

          {isNumeric && (
            <label>
              <RequiredLabel>Value</RequiredLabel>
              <TextField.Root
                type="number"
                {...register('value')}
                placeholder="42"
              />
              {errors.value && (
                <Text as="div" size="1" color="red" mt="1">
                  {errors.value.message}
                </Text>
              )}
            </label>
          )}

          {isFile && (
            <Flex direction="column" gap="2">
              <RequiredLabel>File</RequiredLabel>
              <div
                className={styles.dropzone}
                role="button"
                tabIndex={0}
                aria-label="Upload a file: drag and drop, or activate to browse"
                data-dragging={dragging}
                data-disabled={busy}
                onClick={openFilePicker}
                onKeyDown={onDropzoneKeyDown}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <Text size="2" weight="medium">
                  {file ? file.name : 'Drag & drop a file here'}
                </Text>
                <Text size="1" color="gray">
                  {file ? formatBytes(file.size) : 'or click to browse'}
                </Text>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                disabled={busy}
                onChange={(event) =>
                  acceptFile(event.target.files?.[0] ?? null)
                }
              />
              {errors.file && (
                <Text as="div" size="1" color="red">
                  {errors.file.message}
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
};
