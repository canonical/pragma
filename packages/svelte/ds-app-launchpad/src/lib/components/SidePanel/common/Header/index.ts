import { CloseButton } from "./common/index.js";
import { default as HeaderRoot } from "./Header.svelte";

const Header = HeaderRoot as typeof HeaderRoot & {
  /**
   * `SidePanel.Header.CloseButton` closes its SidePanel through the Invoker Commands API. `SidePanel.Header` renders it by default.
   *
   * @example
   * ```svelte
   * <SidePanel.Header.CloseButton />
   * ```
   */
  CloseButton: typeof CloseButton;
};

Header.CloseButton = CloseButton;

export type { CloseButtonProps } from "./common/index.js";
export type * from "./types.js";
export { Header };
