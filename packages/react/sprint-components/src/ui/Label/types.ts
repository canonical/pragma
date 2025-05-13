/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";

export interface LabelProps {
  /* A unique identifier for the Label */
  id?: string;
  /* The id of the element that this label is associated with */
  htmlFor?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
}
