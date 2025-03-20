/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { BaseInputProps } from "../../inputs/index.ts";
import type { BaseFieldProps, BaseWrapperProps } from "../../types.js";

type BaseComponentProps = BaseInputProps & BaseWrapperProps;

export type WrapperProps<
	ComponentProps extends BaseComponentProps = BaseFieldProps,
> = BaseFieldProps & {
	/* A unique identifier for the Wrapper */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;

	/* The description of the input */
	description?: string;

	/* The name of input labelled */
	label?: string;

	/* Is the field optional */
	isOptional?: boolean;

	/* TODO */
	nestedRegisterProps?: Record<string, unknown>;

	/* Whether to unregister the field on unmount */
	unregisterOnUnmount?: boolean;

	/* Whether to mock the label */
	mockLabel?: boolean;

	/* The input to render */
	Component: React.ComponentType<ComponentProps>;
};
