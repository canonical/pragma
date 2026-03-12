/* @canonical/generator-ds 0.17.1 */

import type { SvelteHTMLElements } from "svelte/elements";

export type BaseProps = SvelteHTMLElements["dl"];
export interface DescriptionListProps extends BaseProps {
  /**
   * The layout of the list's items.
   * @default "auto"
   */
  layout?: Layout;
}

export interface DescriptionListContext {
  layout: Layout;
}

type Layout = "list" | "grid" | "auto";
