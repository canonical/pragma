/* @canonical/generator-ds 0.9.0-experimental.12 */

import type {
  CodeDiffViewerAddComment,
  CodeDiffViewerLineSelectOptions,
} from "../../types.js";
import type { DiffContentLineProps } from "../DiffLine/types.js";

export type AnnotationOptions = {
  /**
   * The current line number in the new file.
   */
  newLineNumber: number;
  /**
   * The current line number in the old file.
   */
  oldLineNumber: number;
  /**
   * The current line number in the diff file.
   * This is the line number that will be used to match the line decorations.
   */
  diffLineNumber: number;
  AddComment?: CodeDiffViewerAddComment;
  onLineClick?: (options: CodeDiffViewerLineSelectOptions) => void;
};

export type AnnotatedDiffLineProps = Omit<DiffContentLineProps, "onLineClick"> &
  AnnotationOptions;
