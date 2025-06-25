import type { AllOrNone } from "@canonical/utils";
import type React from "react";

/**
 * When this is provided, the component will add support for collapsing the diff code section.
 */
export type CollapseOption = {
  /**
   * Whether the diff code section is collapsed.
   */
  isCollapsed: boolean;
  /**
   * Toggle the collapse state of the diff code section.
   */
  onCollapseToggle: (collapsed: boolean) => void;
};

export type DiffOptions = {
  /**
   * The diff file being displayed.
   *
   * In case you need to parse raw diff text,
   * you can use the `parseDiff` function from `@canonical/react-ds-app-launchpad`
   */
  diff: DiffFile;
};

export type WrapLinesOption = {
  /**
   * Whether the code lines should not overflow.
   */
  wrapLines?: boolean;
};

export type LineDecorationOptions = {
  /**
   * Additional UI elements to be displayed bellow the code diff lines.
   */
  lineDecorations?: Record<number, React.ReactElement>;
};

type UserContextOptions = LineDecorationOptions &
  DiffOptions &
  WrapLinesOption &
  AllOrNone<CollapseOption>;

type ManagedContextOptions = {
  addCommentOpenLocations: Set<number>;
  toggleAddCommentLocation: (lineNumber: number) => void;
};

export type ContextOptions = UserContextOptions & ManagedContextOptions;

export type ProviderOptions = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Consider using `GitDiffViewer.FileHeader`, and `GitDiffViewer.CodeDiff` components.
   */
  children?: React.ReactNode;
} & UserContextOptions;

export type Position = {
  start: number;
  end: number;
};

export type Hunk = {
  header: string;
  positions: {
    old: Position;
    new: Position;
    diff: Position;
  };
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
