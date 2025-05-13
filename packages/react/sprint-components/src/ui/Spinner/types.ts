/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react'

export interface SpinnerProps {
  /* A unique identifier for the Spinner */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  label?: string;
  /* The size of the spinner */
  size?: 'small' | 'medium' | 'large';
  speed?: 'slow' | 'medium' | 'fast';
}