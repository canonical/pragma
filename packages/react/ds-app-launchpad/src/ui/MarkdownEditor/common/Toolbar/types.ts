/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type {
  ToolbarButtonProps,
  ToolbarGroupProps,
  ToolbarSeparatorProps,
} from "./common/index.js";

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

export type ToolbarComponent = ((props: ToolbarProps) => React.ReactElement) & {
  Button: (props: ToolbarButtonProps) => React.ReactElement | null;
  Group: (props: ToolbarGroupProps) => React.ReactElement | null;
  Separator: (props: ToolbarSeparatorProps) => React.ReactElement | null;
};
