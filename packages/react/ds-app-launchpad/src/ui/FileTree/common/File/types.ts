/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface FileProps {
  /* A unique identifier for the File */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  /* File name */
  name: string;
}
