/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { JSX } from "react";

export interface LabelMessages {
	/* The optional message */
	optional: () => string;
}

export interface LabelProps {
	/* A unique identifier for the Label */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;
	/* The name of input labelled */
	name: string;
	/* Should reference the ID of the input */
	htmlFor?: string;
	/* Is the field optional */
	isOptional?: boolean;
	/* Custom messages */
	messages?: LabelMessages;
	/* The element to render as */
	tag?: keyof JSX.IntrinsicElements;
}
