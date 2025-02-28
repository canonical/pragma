/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from 'react'

export interface LabelProps {
  /* A unique identifier for the Label */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
}