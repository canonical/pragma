/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react'

export interface ContentProps {
  /* A unique identifier for the Content */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
}