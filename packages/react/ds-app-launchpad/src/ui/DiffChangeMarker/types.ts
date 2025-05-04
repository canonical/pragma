/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";

export type DiffChangeAutoOptions = {
  deletions: number;
  additions: number;
};

export type DiffChangeType = "added" | "deleted" | "modified";

export type DiffChangeManualOptions = {
  type: DiffChangeType;
};

export type MarkerOptions = {
  markerStyle: "detailed" | "simple";
};

export type DiffChangeMarkerProps = {
  /* A unique identifier for the DiffChangeMarker */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
} & MarkerOptions &
  (DiffChangeAutoOptions | DiffChangeManualOptions);
