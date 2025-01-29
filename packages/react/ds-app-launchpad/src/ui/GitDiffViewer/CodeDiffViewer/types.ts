/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type CodeDiffViewerChildrenRender = (
  lineNumber: number,
  onClose: () => void,
) => React.ReactNode;

export interface CodeDiffViewerProps {
  /* A unique identifier for the CodeDiffViewer */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Add comment element */
  children?: CodeDiffViewerChildrenRender;
  /* Inline styles */
  style?: React.CSSProperties;
}
