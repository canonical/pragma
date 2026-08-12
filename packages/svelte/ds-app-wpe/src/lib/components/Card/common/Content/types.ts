import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

/**
 * Props for Card.Content
 * @implements ds:global.subcomponent.card-content
 */
export interface ContentProps extends BaseProps {
  children: Snippet;
}
