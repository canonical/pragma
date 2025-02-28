/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

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

export interface FieldProps {
	/* A unique identifier for the Field */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;

	/* The type of input field Enum*/
	inputType: InputType;

	/* Custom component to render */
	CustomComponent?: React.ElementType;
}
