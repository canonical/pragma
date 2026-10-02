import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface HeaderProps extends BaseProps {
  /** The side panel title. It names the side panel. */
  children?: Snippet;
  /**
   * The close button, rendered after the title and kept out of the side panel's accessible name.
   * - `true`: a `SidePanel.Header.CloseButton`, wired to close the SidePanel.
   * - `false`: no close button.
   * - A snippet: rendered in its place.
   *
   * @default true
   */
  closeButton?: boolean | Snippet;
}
