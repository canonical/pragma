import { Modal as GlobalModal } from "@canonical/svelte-ds-global";
import { Header } from "./common/index.js";
import { default as ModalRoot } from "./Modal.svelte";

const Modal = ModalRoot as typeof ModalRoot & {
  /** The modal's title and a `Button`-based close button. See `Modal.Header` in `@canonical/svelte-ds-global` for its API and usage patterns. */
  Header: typeof Header;
  /** The modal's main information. See `Modal.Content` in `@canonical/svelte-ds-global` for its API and usage patterns. */
  Content: typeof GlobalModal.Content;
  /** The modal's actions. See `Modal.Footer` in `@canonical/svelte-ds-global` for its API and usage patterns. */
  Footer: typeof GlobalModal.Footer;
};

Modal.Header = Header;
Modal.Content = GlobalModal.Content;
Modal.Footer = GlobalModal.Footer;

export type {
  CloseButtonProps as ModalHeaderCloseButtonProps,
  HeaderProps as ModalHeaderProps,
} from "./common/index.js";
export type * from "./types.js";
export { Modal };
