import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

/**
 * Props for Card.Header
 * @implements ds:global.subcomponent.card-header
 */
export interface HeaderProps extends BaseProps {
  children: Snippet;
}
