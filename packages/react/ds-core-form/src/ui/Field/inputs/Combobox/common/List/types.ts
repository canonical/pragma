/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { Option, OptionsProps } from "../../../../types.js";

export type ListProps = OptionsProps & {
	/* Additional CSS classes */
	className?: string;
	/* Child elements */
	children?: React.ReactNode;
	/* Inline styles */
	style?: React.CSSProperties;

	getMenuProps: () => unknown;

	getItemProps: () => unknown;

	highlightedIndex: number;

	convertItemToString: (option: Option) => string;

	fieldValue: string;

	/* The key to read the value from */
	valueKey: string;

	/* */
	isOpen: boolean;
};
