import type { CheckboxProps } from "./Checkbox/types.js";
import type { RangeProps } from "./Range/types.js";
import type { SelectProps } from "./Select/types.js";
import type { SimpleChoicesProps } from "./SimpleChoices/types.js";
import type { TextProps } from "./Text/types.js";
import type { TextareaProps } from "./Textarea/types.js";

export type BaseInputProps = {
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	name: string;
	registerProps?: Record<string, unknown>; //TODO improve
};

export type Option = {
	value: string;
	label: string;
	disabled?: boolean;
};

export type OptionsProps = {
	options: Option[];
};

export type InputProps =
	| CheckboxProps
	| TextProps
	| TextareaProps
	| SelectProps
	| RangeProps
	| SimpleChoicesProps;
