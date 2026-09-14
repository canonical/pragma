import type { ComponentProps } from "react";

type OwnProps = {
  /**
   * Lower bound, required as a number. Both the number input and the slider
   * share it, so the two controls represent the same range (an omitted `min`
   * would leave the number unbounded while the slider fell back to 0).
   */
  min: number;

  /** Upper bound, required as a number — shared by both controls (see {@link min}). */
  max: number;

  /**
   * Accessible label for the slider sub-control. The visible field label is on
   * the number input (the canonical control); the slider needs its own name so
   * assistive tech can tell sliders apart across a form. Defaults to a name
   * derived from the field `name` (e.g. `"volume (slider)"`).
   */
  sliderLabel?: string;
};

/**
 * Props for the presentational Range control (no react-hook-form). The field
 * tier binds the NUMBER input (the canonical, registered control) by spreading
 * react-hook-form's `register()` result here; the slider is a JS-only mirror.
 *
 * The rendered root is a presentational `<div class="ds range-control">` that
 * lays the two controls out; the component's native props are the number
 * `<input>`'s — the labelable, registered control they are forwarded to.
 */
export type RangeControlProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
