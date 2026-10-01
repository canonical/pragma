import type { ComponentProps } from "react";

type OwnProps = {
  /** Selected files (controlled value). */
  value?: File[];

  /** Called with the next file list when files are added or removed. */
  onChange?: (files: File[]) => void;

  /** Accepted MIME types (e.g. "image/*,.pdf") */
  accept?: string;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Maximum number of files */
  maxFiles?: number;

  /** Allow multiple file selection */
  multiple?: boolean;

  /** Whether the input is disabled */
  disabled?: boolean;
};

/** Props for the presentational FileUpload input (controlled, no
 * react-hook-form). Renders a `<div class="ds input file-upload">` as its root. */
export type FileUploadInputProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
