/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from 'react'

export interface FormProps {
  /* A unique identifier for the Form */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
}