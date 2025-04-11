/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type CodeDiffViewerAddComment = (props: {
  lineNumber: number;
  onClose: () => void;
}) => React.ReactNode;

export type CodeDiffViewerProps = {
  /** A unique identifier for the CodeDiffViewer */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Add comment element.
   * If provided, the add comment button will be displayed on the line number.
   */
  AddComment?: CodeDiffViewerAddComment;
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
