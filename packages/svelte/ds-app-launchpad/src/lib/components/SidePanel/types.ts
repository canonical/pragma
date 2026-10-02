import type { Snippet } from "svelte";
import type {
  ModalCloseProps,
  ModalProps,
  ModalTriggerProps,
} from "../Modal/index.js";

/** Invoker command attributes that open the side panel, to spread on a button. */
export type SidePanelTriggerProps = ModalTriggerProps;

/** Invoker command attributes that close the side panel, to spread on a button. */
export type SidePanelCloseProps = ModalCloseProps;

export interface SidePanelProps extends ModalProps {
  /**
   * The button that opens the side panel, rendered before it.
   *
   * Snippet arguments:
   * - `triggerProps`: `{ commandfor, command: "show-modal", "aria-haspopup": "dialog" }` to spread on the button.
   */
  trigger?: Snippet<[triggerProps: SidePanelTriggerProps]>;
  /**
   * Which user actions close the side panel. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby).
   * - `"any"`: outside click, close requests (e.g. Escape) and programmatic close.
   * - `"closerequest"`: close requests and programmatic close.
   * - `"none"`: programmatic close only.
   *
   * @default "any"
   */
  closedby?: ModalProps["closedby"];
  /**
   * The composed sections — `SidePanel.Header`, `SidePanel.Content` and `SidePanel.Footer`, in that order.
   *
   * Snippet arguments:
   * - `closeProps`: `{ commandfor, command: "close" }` to spread on a button that closes the side panel.
   * - `close`: A function to close the side panel.
   */
  children?: Snippet<[closeProps: SidePanelCloseProps, close: () => void]>;
  /**
   * `open` serves two purposes:
   * - As an SSR mechanism to render the side panel already open without client-side JS.
   *   Note: a dialog displayed this way is non-modal, so the component styles emulate a modal and, once hydrated, upgrade it to a real one.
   * - As a two-way bindable prop once hydrated: setting it maps to `showModal()` / `close()`, and it is updated back to reflect the state change triggered by other means (e.g., invoker commands, Escape press, outside click).
   */
  open?: ModalProps["open"];
}
