/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { InputProps, TODONativeInputTypes } from "../../types.js";

type NativeTextProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalTextProps = {
	/* The type of input field Enum*/
	inputType?: TODONativeInputTypes;
};

export type TextProps = InputProps<NativeTextProps & AdditionalTextProps>;
