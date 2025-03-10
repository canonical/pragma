/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { EditMode } from "../../types.js";

export interface ViewModeTabsProps {
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** The current edit mode */
  editMode: EditMode;
  /** Callback for edit mode change */
  onEditModeChange: (mode: EditMode, eventType: "click" | "keydown") => void;
  ariaLabelMessage?: string;
}
