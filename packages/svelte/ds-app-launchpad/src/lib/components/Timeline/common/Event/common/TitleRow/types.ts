/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface TitleRowProps extends BaseProps {
  /**
   * The text to display at the start of the title row.
   */
  leadingText?: string;
  /**
   * Main content to be displayed in the title row.
   */
  children: Snippet<[]>;
  /**
   * The date to display at the end of the title row.
   */
  date: Snippet<[]>;
}
