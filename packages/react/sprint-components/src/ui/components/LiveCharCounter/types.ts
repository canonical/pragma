/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react'

export interface LiveCharCounterProps {
  /* A unique identifier for the LiveCharCounter */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  /* Maximum character limit */
  maxLength?: number;
}