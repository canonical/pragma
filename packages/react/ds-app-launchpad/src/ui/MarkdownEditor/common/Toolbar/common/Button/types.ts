/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export type ToolbarButtonProps = {
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Toolbar button label */
  label: string;
  /** The shortcut key to trigger the button */
  shortcut?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
