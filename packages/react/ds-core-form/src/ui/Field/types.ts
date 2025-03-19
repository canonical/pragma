/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type {
  CheckboxProps,
  TextProps,
  TextareaProps,
} from "./inputs/index.js";

/**
 * A generic type for an instantiated higher-order component (HOC) used as form input middleware.
 * @template ExtendedProps - The props type that extends the base FieldProps with additional properties.
 * @param WrappedComponent - The React component to be enhanced, accepting FieldProps.
 * @returns A new React component with FieldProps extended by ExtendedProps.
 */
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

  /**
   * middleware to apply to the input
   **/
  middleware?: FormInputHOC[];

  /**
   * An optional wrapper component to render around the input.
   */
  WrapperComponent?: React.ElementType;
} & InputProps;

export type FormInputHOC<ExtendedProps extends FieldProps = FieldProps> = (
  WrappedComponent: React.ComponentType<FieldProps>,
) => React.ComponentType<ExtendedProps>;
