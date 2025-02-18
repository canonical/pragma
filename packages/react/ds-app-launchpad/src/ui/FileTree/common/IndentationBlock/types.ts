/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface IndentationBlockProps {
  /* A unique identifier for the IndentationBlock */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  /* Depth of the indentation */
  depth: number;
}
