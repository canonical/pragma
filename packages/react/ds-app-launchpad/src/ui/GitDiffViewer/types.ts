import type React from "react";
import type { CodeDiffViewerProps } from "./CodeDiffViewer/types.js";
import type { DiffViewerProviderProps } from "./DiffViewerContext/types.js";
import type { FileHeaderProps } from "./FileHeader/types.js";

export type GitDiffViewerType = React.FC<GitDiffViewerProps> & {
  CodeDiff: React.FC<CodeDiffViewerProps>;
  FileHeader: React.FC<FileHeaderProps>;
};

export type GitDiffViewerProps = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  diff: DiffFile;
  /**
   * Consider using `GitDiffViewer.FileHeader`, and `GitDiffViewer.CodeDiff` components.
   */
  children?: React.ReactNode;
} & DiffViewerProviderProps;

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

export type DiffFile = {
  oldPath: string;
  newPath: string;
  hunks: Hunk[];
  fileChangeState: "none" | "added" | "deleted" | "modified";
};
