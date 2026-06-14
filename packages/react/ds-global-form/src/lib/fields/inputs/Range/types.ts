/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps } from "../../types.js";

type NativeRangeProps = React.InputHTMLAttributes<HTMLInputElement>;

export type RangeProps = InputProps<NativeRangeProps> & {
  // by default, min and max can be strings.
  // We use a stricter definition so that we can use the same value for min, max, and aria-valuemin, aria-valuemax attributes
  min: number;
  max: number;
};
