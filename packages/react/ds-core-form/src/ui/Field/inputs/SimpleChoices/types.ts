/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { BaseInputProps, OptionsProps } from "../types.js";

export type OptionProps = {
	name: string;
	type: string;
	value: string;
	label: string;
	// TODO, a function
	register: unknown;
	registerProps?: Record<string, unknown>; //TODO improve
	disabled: boolean;
};

export type SimpleChoicesProps = BaseInputProps &
	OptionsProps & {
		/** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
		isMultiple?: boolean;

		/** Whether the input is disabled */
		disabled?: boolean;
	};
