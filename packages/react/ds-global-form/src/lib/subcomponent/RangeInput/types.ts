import type { ComponentProps } from "react";

type OwnProps = {
  /** Minimum value (also used for aria-valuemin). */
  min: number;
  /** Maximum value (also used for aria-valuemax). */
  max: number;
};

/**
 * Props for the presentational Range input (no react-hook-form).
 *
 * This component has no single root element — it renders a fragment holding an
 * `<input type="range">` and the live-value `<output>` that reports it. Its
 * native props are the `<input>`'s: that is the control, and the `<output>` is
 * derived from it (`htmlFor` + the current `value`), so there is no second
 * element for a consumer to address.
 */
export type RangeInputProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
