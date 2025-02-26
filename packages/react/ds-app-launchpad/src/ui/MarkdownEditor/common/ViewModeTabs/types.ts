/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { EditMode } from "../../types.js";

export interface ViewModeTabsProps {
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;

  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
}
