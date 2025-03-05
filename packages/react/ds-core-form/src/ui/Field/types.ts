/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type {
  CheckboxProps,
  TextProps,
  TextareaProps,
} from "./inputs/index.js";

export enum InputType {
  Text = "text",
  Password = "password",
  Email = "email",
  Number = "number",
  Tel = "tel",
  Url = "url",
  Textarea = "textarea",
  Custom = "custom",
  Checkbox = "checkbox",
  // Date = "date",
  // Time = "time",
  // DatetimeLocal = "datetime-local",
  // Month = "month",
  // Week = "week",
  // Color = "color",
}

export type InputProps = CheckboxProps | TextProps | TextareaProps;

export type FieldProps = {
  /**
   * Type of input to render
   */
  inputType: InputType;

  /**
   * Custom component to render
   **/
  CustomComponent?: React.ElementType;
} & InputProps;
