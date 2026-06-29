import type React from "react";

type NativeInputAttrs = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Props for the presentational Range control (no react-hook-form). The field
 * tier binds the NUMBER input (the canonical, registered control) by spreading
 * react-hook-form's `register()` result here; the slider is a JS-only mirror.
 */
export type RangeControlProps = NativeInputAttrs & {
  /**
   * Accessible label for the slider sub-control. The visible field label is on
   * the number input (the canonical control); the slider needs its own name.
   */
  sliderLabel?: string;
};
