/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { InputType } from "./types.js";
import type { FieldProps } from "./types.js";

/**
 * description of the Field component
 * @returns {React.ReactElement} - Rendered Field
 */
const Field = ({
  id,
  children,
  className,
  style,
  inputType,
  CustomComponent,
}: FieldProps): React.ReactElement => {
  switch (inputType) {
    case InputType.Textarea:
      return <textarea />;
    case InputType.Custom:
      // @ts-ignore // TODO Add special type for both or none
      return <CustomComponent />;
    default:
      return <input />;
  }
};

export default Field;
