/* @canonical/generator-canonical-ds 0.0.1 */
import type { DiffFile } from "../types.js";

export type DiffViewerContextType = {
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

export type DiffViewerProviderProps = {
  children?: React.ReactNode;
  diff?: DiffFile;
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  wrapLines?: boolean;
  onWrapLinesToggle?: (wrapLines: boolean) => void;
  lineDecorations?: Record<number, React.ReactElement>;
  onLineDecorationsChange?: (
    lineDecorations: Record<number, React.ReactElement>,
  ) => void;
};
