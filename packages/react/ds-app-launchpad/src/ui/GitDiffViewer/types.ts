import type React from "react";
import type { CodeDiffViewerProps, FileHeaderProps } from "./common/index.js";

export type ContextOptions = {
  /**
   * Whether the diff code section is collapsed.
   */
  isCollapsed: boolean;
  /**
   * Toggles the collapse state of the diff code section.
   */
  toggleCollapse: () => void;
  /**
   * Whether the code lines should not overflow.
   */
  wrapLines: boolean;
  /**
   * Toggle the wrap lines state.
   */
  toggleWrapLines: () => void;
  /**
   * The diff file being displayed.
   *
   * In case you need to parse raw diff text,
   * you can use the `parseDiff` function from `@canonical/react-ds-app-launchpad`
   */
  diff?: DiffFile;
  /**
   * Sets the diff file being displayed.
   *
   * In case you need to parse raw diff text,
   * you can use the `parseDiff` function from `@canonical/react-ds-app-launchpad`
   */
  setDiff: (diff: DiffFile) => void;
  /**
   * Additional UI elements to be displayed bellow the code diff lines.
   */
  lineDecorations: Record<number, React.ReactElement>;
  /**
   * Sets additional UI elements to be displayed bellow the code diff lines.
   */
  setLineDecorations: (
    lineDecorations: Record<number, React.ReactElement>,
  ) => void;
  /**
   * Whether the user can add comments to the diff.
   */
  addCommentEnabled: boolean;
  setAddCommentEnabled: (enabled: boolean) => void;

  /**
   * The line number of where the user wants to add a comment.
   */
  addCommentLocations: Set<number>;
  /**
   * Toggle a line number where the user wants to add a comment.
   */
  toggleAddCommentLocation: (lineNumber: number) => void;
};

export type ProviderOptions = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Consider using `GitDiffViewer.FileHeader`, and `GitDiffViewer.CodeDiff` components.
   */
  children?: React.ReactNode;
  diff: DiffFile;
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  wrapLines?: boolean;
  onWrapLinesToggle?: (wrapLines: boolean) => void;
  lineDecorations?: Record<number, React.ReactElement>;
  onLineDecorationsChange?: (
    lineDecorations: Record<number, React.ReactElement>,
  ) => void;
};

export type ProviderComponent = (props: ProviderOptions) => React.ReactElement;

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

export type GitDiffViewerComponent = ProviderComponent & {
  FileHeader: (props: FileHeaderProps) => React.ReactElement | null;
  CodeDiff: (props: CodeDiffViewerProps) => React.ReactElement | null;
};
