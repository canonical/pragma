/* @canonical/generator-ds 0.10.0-experimental.2 */

import { CloseButton } from "./common/index.js";
import { default as HeaderRoot } from "./Header.svelte";

const Header = HeaderRoot as typeof HeaderRoot & {
  /**
   * `DialogContent.Header.CloseButton` is a wrapper over `Button` meant to be used as a close button in dialog headers.
   *
   * @example
   * ```svelte
   * <DialogContent.Header.CloseButton onclick={handleClose} />
   * ```
   */
  CloseButton: typeof CloseButton;
};

Header.CloseButton = CloseButton;

export type { CloseButtonProps } from "./common/index.js";
export type { HeaderProps } from "./types.js";
export { Header };
