import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface ExampleProps extends Omit<BaseProps, "children"> {}
