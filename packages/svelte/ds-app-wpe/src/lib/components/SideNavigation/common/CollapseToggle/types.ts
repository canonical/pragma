import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["button"];

export interface CollapseToggleProps extends BaseProps {
  /**
   * Whether the navigation is currently expanded — drives the icon direction
   * and the default `aria-label`.
   * @default true
   */
  expanded?: boolean;
}
