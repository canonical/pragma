/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type DiffContentLine = {
  type: "add" | "remove" | "context";
  lineNum1: number | string | null;
  lineNum2: number | string | null;
  content: string;
};

export type DiffHunkLine = {
  type: "hunk";
  hunkHeader: string;
};

export type DiffLineProps = {
  /* A unique identifier for the DiffLine */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  language?: string;
  onCommentOpen?: () => void;
  wrapLines: boolean;
} & (DiffContentLine | DiffHunkLine);
