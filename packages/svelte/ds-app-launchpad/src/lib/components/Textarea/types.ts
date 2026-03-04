import type { HTMLTextareaAttributes } from "svelte/elements";

export interface TextareaProps
  extends Omit<HTMLTextareaAttributes, "children" | "rows"> {
  /**
   * The value of the textarea.
   *
   * **@bindable**
   */
  value?: string;
  /**
   * The ref of the textarea.
   *
   * **@bindable**
   */
  ref?: HTMLTextAreaElement;

  /**
   * The number of rows the textarea should have.
   *
   * This can be an tuple of [minRows, maxRows] to allow the textarea to grow dynamically.
   *
   * @default [2, 5] // min 2 rows, max 5 rows
   */
  rows?: number | [minRows: number, maxRows: number];
}
