import type { InputProps } from "../../types.js";

type AdditionalFileUploadProps = {
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

export type FileUploadProps = InputProps<AdditionalFileUploadProps>;
