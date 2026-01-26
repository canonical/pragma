/* @canonical/generator-ds 0.11.0 */

import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface ExampleProps extends Exclude<BaseProps, "children"> {}
