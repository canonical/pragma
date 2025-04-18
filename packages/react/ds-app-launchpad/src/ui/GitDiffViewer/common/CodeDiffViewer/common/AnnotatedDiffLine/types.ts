/* @canonical/generator-ds 0.9.0-experimental.12 */

import type {
  CodeDiffViewerAddComment,
  CodeDiffViewerLineSelectOptions,
} from "../../types.js";
import type { DiffContentLineProps } from "../DiffLine/types.js";

export type AnnotatedDiffLineProps = Omit<
  DiffContentLineProps,
  "onLineClick" | "lineNum1" | "lineNum2"
> & {
  lineNum1: number | null;
  lineNum2: number | null;
  diffLineNumber: number;
  AddComment?: CodeDiffViewerAddComment;
  onLineClick?: (options: CodeDiffViewerLineSelectOptions) => void;
};
