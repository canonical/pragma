/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["li"];

export interface HiddenEventsProps extends BaseProps {
  /**
   * The number of hidden events.
   */
  numHidden: number;
}
