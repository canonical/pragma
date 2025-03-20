/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { BaseFieldProps } from "../../types.js";

export type WrapperProps = BaseFieldProps & {
	/* A unique identifier for the Wrapper */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;

	/* The name of input labelled */
	label?: string;

	/* Is the field optional */
	isOptional?: boolean;

	/* TODO */
	nestedRegisterProps?: Record<string, unknown>;

	/* Whether to unregister the field on unmount */
	unregisterOnUnmount?: boolean;

	Component: React.ComponentType<BaseFieldProps>;
};
