/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";

export type FileHeaderProps = {
  /** A unique identifier for the FileHeader */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Shown by default */
  hideCollapse?: boolean;
  showChangeCount?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
};
