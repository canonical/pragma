/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react'

export interface PackageHeaderProps {
  /* A unique identifier for the PackageHeader */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;
  packageData: any;
}