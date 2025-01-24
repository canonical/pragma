import type React from "react";
import type { ReactElement } from "react";

export type AddComponentType = React.FC<{
  lineNumber: number;
  onClose: () => void;
}>;

export type GitDiffViewerProps = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  diff: ParsedFile;
  lineDecorations?: Record<number, ReactElement>;
  AddComment?: AddComponentType;
  wrapLines?: boolean;
};

export type Hunk = {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: {
    type: "add" | "remove" | "context";
    content: string;
  }[];
};

export type ParsedFile = {
  oldPath: string;
  newPath: string;
  hunks: Hunk[];
};
