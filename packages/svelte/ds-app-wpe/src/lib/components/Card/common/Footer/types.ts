import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

/**
 * Props for Card.Footer
 * @implements ds:global.subcomponent.card-footer
 */
export interface FooterProps extends BaseProps {
  /** Required child contents: tags and labels (e.g. chips), not CTAs or links. */
  children: Snippet;
}
