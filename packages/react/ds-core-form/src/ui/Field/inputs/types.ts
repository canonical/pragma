import type { CheckboxProps } from "./Checkbox/types.js";
import type { TextProps } from "./Text/types.js";
import type { TextareaProps } from "./Textarea/types.js";

export type BaseInputProps = {
	id?: string;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
	name: string;
	registerProps?: Record<string, unknown>; //TODO improve
};

export type InputProps = CheckboxProps | TextProps | TextareaProps;
