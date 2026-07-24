// Ported from @canonical/react-ds-app ApplicationLayout

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface ApplicationLayoutProps extends BaseProps {
  /** Main content (default slot). Typically a ViewLayout. */
  children?: Snippet;
  /**
   * Application navigation (named slot), rendered in the leading
   * min-content column.
   */
  navigation?: Snippet;
}
