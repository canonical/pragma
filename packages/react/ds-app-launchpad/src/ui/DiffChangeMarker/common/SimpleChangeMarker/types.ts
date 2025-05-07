/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import type { DiffChangeType } from "ui/DiffChangeMarker/types.js";

export interface SimpleChangeMarkerProps {
  /* A unique identifier for the SimpleChangeMarker */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  changeType: DiffChangeType;
}
