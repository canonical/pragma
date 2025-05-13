/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react';

export interface CatachterCounterProps {
  /* A unique identifier for the CatachterCounter */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  maxNumCharacters: number;
}
