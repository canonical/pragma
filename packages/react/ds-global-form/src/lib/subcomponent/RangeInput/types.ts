import type React from "react";

/** Props for the presentational Range input (no react-hook-form). */
export type RangeInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Minimum value (also used for aria-valuemin). */
  min: number;
  /** Maximum value (also used for aria-valuemax). */
  max: number;
};
