import { CloseButton } from "./common/index.js";
import { default as HeaderRoot } from "./Header.svelte";

const Header = HeaderRoot as typeof HeaderRoot & {
  /**
   * `Modal.Header.CloseButton` closes its Modal through the Invoker Commands API. `Modal.Header` renders it by default.
   *
   * @example
   * ```svelte
   * <Modal.Header.CloseButton aria-label="Dismiss" />
   * ```
   */
  CloseButton: typeof CloseButton;
};

Header.CloseButton = CloseButton;

export type { CloseButtonProps } from "./common/index.js";
export type * from "./types.js";
export { Header };
