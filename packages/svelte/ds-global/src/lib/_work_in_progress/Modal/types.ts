import type { Snippet } from "svelte";
import type { HTMLDialogAttributes } from "svelte/elements";

type BaseProps = Omit<HTMLDialogAttributes, "children">;

/** Invoker command attributes that open the modal, to spread on a button. */
export type ModalTriggerProps = {
  commandfor: string;
  command: "show-modal";
  "aria-haspopup": "dialog";
};

/** Invoker command attributes that close the modal, to spread on a button. */
export type ModalCloseProps = {
  commandfor: string;
  command: "close";
};

/**
 * Props for the Modal pattern
 *
 * @implements ds:global.pattern.modal
 */
export interface ModalProps extends BaseProps {
  /**
   * The button that opens the modal, rendered before it.
   *
   * Snippet arguments:
   * - `triggerProps`: `{ commandfor, command: "show-modal", "aria-haspopup": "dialog" }` to spread on the button.
   */
  trigger?: Snippet<[triggerProps: ModalTriggerProps]>;
  /**
   * Which user actions close the modal. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby).
   * - `"any"`: outside click, close requests (e.g. Escape) and programmatic close.
   * - `"closerequest"`: close requests and programmatic close.
   * - `"none"`: programmatic close only.
   *
   * @default "closerequest"
   */
  closedby?: BaseProps["closedby"];
  /**
   * The composed sections — `Modal.Header`, `Modal.Content` and `Modal.Footer`, in that order.
   *
   * Snippet arguments:
   * - `closeProps`: `{ commandfor, command: "close" }` to spread on a button that closes the modal.
   * - `close`: A function to close the modal.
   */
  children?: Snippet<[closeProps: ModalCloseProps, close: () => void]>;
  /**
   * `open` serves two purposes:
   * - As an SSR mechanism to render the modal already open without client-side JS.
   *   Note: a dialog displayed this way is non-modal, so the component styles emulate a modal and, once hydrated, upgrade it to a real one.
   * - As a two-way bindable prop once hydrated: setting it maps to `showModal()` / `close()`, and it is updated back to reflect the state change triggered by other means (e.g., invoker commands, Escape press, outside click).
   */
  open?: BaseProps["open"];
}

export interface ModalContext {
  /** The dialog's id, which invoker commands target through `commandfor`. */
  readonly id: string;
  /** The id the dialog's `aria-labelledby` points at. The Header sets it on its title. */
  readonly titleId: string;
}
