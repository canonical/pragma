/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps } from "../../types.js";

type NativeRangeProps = React.InputHTMLAttributes<HTMLInputElement>;

export type RangeProps = InputProps<NativeRangeProps> & {
  min: number;
  max: number;
};
