// Ported from @canonical/react-ds-app ViewLayout

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface ViewLayoutProps extends BaseProps {
  /** View content (default slot). Typically a ContentLayout. */
  children?: Snippet;
  /**
   * Contextual aside (named slot), rendered in the trailing min-content
   * column.
   */
  aside?: Snippet;
}
