/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { FieldProps } from "../../types.js";

export type WrapperProps = FieldProps & {
	/* A unique identifier for the Wrapper */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;
};
