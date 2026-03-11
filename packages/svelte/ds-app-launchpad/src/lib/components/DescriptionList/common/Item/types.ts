/* @canonical/generator-ds 0.17.1 */

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

/*
  For components that render specific HTML elements with extended prop sets,
  make sure to change `"div"` to the appropriate HTML element type.
*/
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
