import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface HeaderProps extends BaseProps {
  /** Brand content (logo/wordmark), rendered at the start. Receives `expanded`. */
  brand?: Snippet<[{ expanded: boolean }]>;
  /** Optional application name/wordmark, rendered beside the brand. */
  applicationName?: Snippet<[]>;
  /** Whether the navigation is currently expanded. */
  expanded: boolean;
  /** Called when the collapse toggle is activated. */
  onToggle: () => void;
  /** Id of the region the collapse toggle controls (its `aria-controls`). */
  collapseControls?: string;
}
