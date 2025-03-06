/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface ToolbarProps {
  /** A unique identifier for the Toolbar */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Toolbar label */
  label: string;
}
