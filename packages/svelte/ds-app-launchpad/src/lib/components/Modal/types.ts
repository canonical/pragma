/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Snippet } from "svelte";
import type { HTMLDialogAttributes } from "svelte/elements";

/*
 `open` is omitted, as from the [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#html-only_dialog):
 > Dialogs that are displayed using the open attribute are non-modal.
 > It is possible to toggle the display of the dialog by adding or removing the boolean `open` attribute, but it is not the recommended practice.
*/
type BaseProps = Omit<HTMLDialogAttributes, "open" | "children">;

export type ModalTriggerProps = {
  commandfor: string;
  command: "show-modal";
  "aria-haspopup": "dialog";
};

export interface ModalProps extends BaseProps {
  /**
   * A snippet containing a button element that triggers the modal.
   *
   * Snippet arguments:
   * - `triggerProps`: Props to spread on the button element. It contains:
   *   - `commandfor`: The id of the dialog element. Setting it as `commandfor` associates the button with the dialog to open.
   *   - `command`: Always set to `"show-modal"` to indicate that the button opens a modal.
   *   - `aria-haspopup`: Always set to `"dialog"` to indicate that the button opens a dialog.
   */
  trigger?: Snippet<[triggerProps: ModalTriggerProps]>;
  /**
   * Whether to close the modal when clicking outside of it.
   *
   * @default true
   */
  closeOnOutsideClick?: boolean;
  /**
   * Content of the modal.
   *
   * Snippet arguments:
   * - `commandfor`: The id of the dialog element. Can be used to associate a close button with the dialog by setting it as `commandfor` and `command` to `"close"`.
   * - `close`: A function to close the modal.
   */
  children?: Snippet<[commandfor: string, close: () => void]>;
}

export interface ModalMethods {
  showModal: () => void;
  close: () => void;
}
