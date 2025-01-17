/* @canonical/generator-canonical-ds 0.4.0-experimental.0 */
import type React from "react";

/**
 * Props for the `Reviewers` component.
 */
export interface ReviewersProps {
	/** Unique identifier for the chip. */
	id?: string;

	/** Additional CSS class names. */
	className?: string;

	/** Inline styles for the chip. */
	style?: React.CSSProperties;
}

export type ReviewersPropsType = ReviewersProps &
	Omit<React.HTMLAttributes<HTMLButtonElement>, "children">;
