import type { HTMLButtonAttributes } from "svelte/elements";

export interface ButtonPrimitiveProps
	extends Omit<HTMLButtonAttributes, "href"> {
	ref?: HTMLElement;
	href?: string;
}
