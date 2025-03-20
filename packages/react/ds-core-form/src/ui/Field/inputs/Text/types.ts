/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { BaseInputProps } from "../types.js";

export type TextProps = BaseInputProps & {
  /* The type of input field Enum*/
  inputType?: "text" | "password" | "email" | "number" | "tel" | "url";
} & React.InputHTMLAttributes<HTMLInputElement>;
