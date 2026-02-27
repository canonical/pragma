import type { HTMLInputAttributes } from "svelte/elements";
import type { WithoutChildren } from "type-utils";

interface BaseProps extends WithoutChildren<HTMLInputAttributes> {
	ref?: HTMLInputElement;
}

export interface TextInputPrimitiveProps extends BaseProps {
	type?: "text" | "password" | "email" | "url" | "tel" | "search";
	value?: string;
}

export interface NumberInputPrimitiveProps extends BaseProps {
	type: "number";
	value?: number;
}

export type InputPrimitiveProps =
	| TextInputPrimitiveProps
	| NumberInputPrimitiveProps;
