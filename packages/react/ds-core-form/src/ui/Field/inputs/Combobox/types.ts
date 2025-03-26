/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps, OptionsProps } from "../../types.js";

type CommonProps = {
	/** Whether the input is disabled */
	disabled?: boolean;

	placeholder: string;

	valueKey?: string;

	openOnReset: boolean;
};

type BaseComboboxProps = InputProps<OptionsProps & CommonProps>;

type AdditionalComboboxProps = BaseComboboxProps & {
	/** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
	isMultiple?: boolean;
};

export type ComboboxProps = InputProps<AdditionalComboboxProps>;
