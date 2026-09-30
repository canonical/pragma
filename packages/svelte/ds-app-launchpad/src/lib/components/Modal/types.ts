/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Snippet } from "svelte";
import type { HTMLDialogAttributes } from "svelte/elements";

type BaseProps = Omit<HTMLDialogAttributes, "children">;

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
   * Which user actions close the modal. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby).
   * - `"any"`: outside click, close requests (e.g. Escape) and programmatic close.
   * - `"closerequest"`: close requests and programmatic close.
   * - `"none"`: programmatic close only.
   *
   * @default "any"
   */
  closedby?: BaseProps["closedby"];
  /**
   * Content of the modal.
   *
   * Snippet arguments:
   * - `commandfor`: The id of the dialog element. Can be used to associate a close button with the dialog by setting it as `commandfor` and `command` to `"close"`.
   * - `close`: A function to close the modal.
   */
  children?: Snippet<[commandfor: string, close: () => void]>;
  /**
   * `open` serves two purposes:
   * - As an SSR mechanism to render the modal already open without client-side JS.
   *   Note: a dialog displayed this way is non-modal, so the component styles emulate a modal and, once hydrated, upgrade it to a real one.
   * - As a two-way bindable prop once hydrated: setting it maps to `showModal()` / `close()`, and it is updated back to reflect the state change triggered by other means (e.g., invoker commands, Escape press, outside click).
   */
  open?: BaseProps["open"];
}
