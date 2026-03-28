/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { FieldValues, UseFormRegister } from "react-hook-form";
import type { InputProps, OptionsProps } from "../../types.js";

export type OptionProps = {
  name: string;
  type: string;
  value: string;
  label: string;
  // TODO, a function
  register: UseFormRegister<FieldValues>;
  registerProps?: Record<string, unknown>; //TODO improve
  disabled: boolean;
};

type AdditionalSimpleChoicesProps = OptionsProps & {
  /** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
  isMultiple?: boolean;

  /** Whether the input is disabled */
  disabled?: boolean;

  /** Layout: "inline" wraps options horizontally, "stacked" puts each on its own line */
  layout?: "inline" | "stacked";
};

export type SimpleChoicesProps = InputProps<AdditionalSimpleChoicesProps>;
