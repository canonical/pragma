/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type CodeDiffViewerLineSelectOptions = {
  lineNumber: number;
  diffLineNumber: number;
};

export type CodeDiffViewerAddComment = (
  props: {
    onClose: () => void;
  } & CodeDiffViewerLineSelectOptions,
) => React.ReactNode;

export type CodeDiffViewerProps = {
  /** A unique identifier for the CodeDiffViewer */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Add comment element.
   * If provided, the code viewer will be in interactive mode.
   */
  AddComment?: CodeDiffViewerAddComment;
  /** Callback function for when a line is clicked.
   * If provided, the code viewer will be in interactive mode.
   */
  onLineClick?: (options: CodeDiffViewerLineSelectOptions) => void;
  /** Inline styles */
  style?: React.CSSProperties;

  /**
   * Disable width calculation for the table (default: false).
   * This is useful when there is multiple instances of this component on the same page.
   * To avoid doing the same width calculation for each instance separately.
   *
   * Instead, ref the table element and set the width on the parent element.
   * To update the table width, call the `utils/updateTableWidth` function.
   */
  disableWidthCalculation?: boolean;
};
