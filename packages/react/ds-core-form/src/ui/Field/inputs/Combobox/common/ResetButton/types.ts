/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";

export interface ResetButtonMessages {
	/* The optional message */
	reset: () => string;
}

export interface ResetButtonProps {
	/* A unique identifier for the ResetButton */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Inline styles */
	style?: React.CSSProperties;

	/* Custom messages */
	messages?: ResetButtonMessages;
}
