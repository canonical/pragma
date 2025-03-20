/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { InputProps } from "./inputs/index.js";

/**
 * Represents the type of input to render.
 */
export type InputType =
	| "text"
	| "password"
	| "email"
	| "number"
	| "tel"
	| "url"
	| "textarea"
	| "custom"
	| "checkbox"
	| "range"
	| "select"
	| "simple-choices";

// | "date"
// | "time"
// | "datetime-local"
// | "month"
// | "week"
// | "color";

export type BaseWrapperProps = {
	/**
	 * middleware to apply to the input
	 **/
	middleware?: FormInputHOC[];

	/**
	 * An optional wrapper component to render around the input.
	 */
	WrapperComponent?: React.ElementType;
};

/**
 * A type for an instantiated higher-order component (HOC) wrapping an Input.
 * This accurately represents the props that can be passed to the HOC.
 */
export type BaseFieldProps = BaseWrapperProps & InputProps;

/**
 * The props for the Field component, switching between different input types.
 */
export type FieldProps = {
	/**
	 * Type of input to render
	 */
	inputType: InputType;

	/**
	 * Custom component to render
	 **/
	CustomComponent?: React.ElementType;
} & BaseFieldProps;

export type FormInputHOC<
	ExtendedProps extends BaseFieldProps = BaseFieldProps,
> = (
	WrappedComponent: React.ComponentType<BaseFieldProps>,
) => React.ComponentType<ExtendedProps>;
