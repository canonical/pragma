/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";

export interface ProgressBarProps {
  /* How much progress has been made, from 0 to 100 */
  percentage: number;

  /* A unique identifier for the ProgressBar */
  id?: string;
  /* Additional CSS classes */
  className?: string;
}
