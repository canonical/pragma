/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface ToolbarGroupProps {
  /* A unique identifier for the ToolbarGroup */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  /* Toolbar group label */
  label: string;
}
