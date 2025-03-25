/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps, OptionsProps } from "../../types.js";

type AdditionalComboboxProps = OptionsProps & {
  /** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
  isMultiple?: boolean;

  /** Whether the input is disabled */
  disabled?: boolean;
};

export type ComboboxProps = InputProps<AdditionalComboboxProps>;
