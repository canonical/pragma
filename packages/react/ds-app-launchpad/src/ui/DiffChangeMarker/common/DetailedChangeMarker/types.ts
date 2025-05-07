/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";

export interface DetailedChangeMarkerProps {
  /* A unique identifier for the DetailedChangeMarker */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;

  added?: string;
  deleted?: string;
  modified?: string;
}
