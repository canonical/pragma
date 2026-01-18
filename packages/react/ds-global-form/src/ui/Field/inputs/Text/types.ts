/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { InputProps, TODONativeInputTypes } from "../../types.js";

type NativeTextProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalTextProps = {
  /* The type of input field Enum*/
  inputType?: TODONativeInputTypes;

  /* The prefix element. Will be a child of `span.prefix` */
  prefix?: React.ReactNode;

  /* The suffix element. Will be a child of `span.suffix` */
  suffix?: React.ReactNode;
};

export type TextProps = InputProps<NativeTextProps & AdditionalTextProps>;
