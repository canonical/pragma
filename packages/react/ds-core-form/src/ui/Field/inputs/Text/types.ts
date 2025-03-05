/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface TextProps {
  /* A unique identifier for the Text */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;

  /* The type of input field Enum*/
  inputType: "text" | "password" | "email" | "number" | "tel" | "url";
}
