/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type DiffContentLine = {
  content: string;
} & (
  | {
      type: "add";
      addLineNumber: number;
    }
  | {
      type: "remove";
      removeLineNumber: number;
    }
  | {
      type: "context";
      // we need both line numbers for context lines
      addLineNumber: number;
      removeLineNumber: number;
    }
);

export type DiffHunkLine = {
  type: "hunk";
  hunkHeader: string;
  hunkIndex: number;
};

type DiffLineCommonProps = {
  /** A unique identifier for the DiffLine */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Callback function for when a line is clicked. */
  onLineClick?: (() => void) | undefined;
};

export type DiffContentLineProps = DiffLineCommonProps & DiffContentLine;
export type DiffHunkLineProps = DiffLineCommonProps & DiffHunkLine;
export type DiffLineProps = DiffContentLineProps | DiffHunkLineProps;
