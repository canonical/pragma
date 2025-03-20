/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { BaseInputProps, OptionsProps } from "../types.js";

// export type TextareaProps = BaseInputProps &
// 	React.HTMLProps<HTMLTextAreaElement>;

export type SelectProps = BaseInputProps &
	OptionsProps &
	React.HTMLProps<HTMLSelectElement>;
