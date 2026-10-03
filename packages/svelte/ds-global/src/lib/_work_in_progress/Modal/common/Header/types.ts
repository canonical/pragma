import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

/**
 * Props for the Modal.Header subcomponent
 *
 * @implements ds:global.subcomponent.modal-header
 */
export interface HeaderProps extends BaseProps {
  /** The modal title. It tells the user what triggered the modal. For heading semantics, wrap it in a heading of the right level. */
  children?: Snippet;
  /**
   * The close button, rendered after the title and kept out of the dialog's accessible name.
   * - `true`: a `Modal.Header.CloseButton`, wired to close the Modal.
   * - `false`: no close button.
   * - A snippet: rendered in its place.
   *
   * @default true
   */
  closeButton?: boolean | Snippet;
}
