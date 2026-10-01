import { Content, Footer, Header } from "./common/index.js";
import { default as ModalRoot } from "./Modal.svelte";

// TODO(button): Use the DS Button in the examples once available.
const Modal = ModalRoot as typeof ModalRoot & {
  /**
   * `Modal.Header` carries the modal title and a close button, wired to close the Modal by default.
   *
   * @example
   * ```svelte
   * <Modal.Header>Discard pending review?</Modal.Header>
   * ```
   */
  Header: typeof Header;
  /**
   * `Modal.Content` holds the modal's main information. It is the only part that scrolls.
   *
   * @example
   * ```svelte
   * <Modal.Content>Main content</Modal.Content>
   * ```
   */
  Content: typeof Content;
  /**
   * `Modal.Footer` holds the modal's actions.
   *
   * @example
   * ```svelte
   * <Modal.Footer>
   *   <button {...closeProps}>Cancel</button>
   *   <button onclick={confirm}>Confirm</button>
   * </Modal.Footer>
   * ```
   */
  Footer: typeof Footer;
};

Modal.Header = Header;
Modal.Content = Content;
Modal.Footer = Footer;

export type {
  CloseButtonProps as ModalHeaderCloseButtonProps,
  ContentProps as ModalContentProps,
  FooterProps as ModalFooterProps,
  HeaderProps as ModalHeaderProps,
} from "./common/index.js";
export { getModalContext } from "./context.js";
export type * from "./types.js";
export { Modal };
