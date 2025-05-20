/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";

export interface SearchControlsProps {
	/* A unique identifier for the SearchControls */
	id?: string;
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;

	type: string;

	searchTerm: string;

	setType: (type: string) => void;

	setSearchTerm: (searchTerm: string) => void;
}
