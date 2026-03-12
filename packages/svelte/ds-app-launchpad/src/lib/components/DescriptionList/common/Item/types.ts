/* @canonical/generator-ds 0.17.1 */

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface ItemProps extends BaseProps {
  /**
   * Term/name of the item
   */
  name: string;
  /**
   * Description/content of the item
   */
  children: Snippet<[]>;
}
