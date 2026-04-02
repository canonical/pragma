/* @canonical/generator-ds 0.10.0-experimental.2 */

import { DialogContent } from "../common/DialogContent/index.js";
import { default as ModalRoot } from "./Modal.svelte";

const Modal = ModalRoot as typeof ModalRoot & {
  /**
   * `Modal.Content` is a layout component that provides a structured container for the modal's content.
   *
   * @example
   * ```svelte
   * <Modal.Content>
   *   <Modal.Content.Header>
   *     Modal Header
   *     <Modal.Content.Header.CloseButton {commandfor} command="close" />
   *   </Modal.Content.Header>
   *   <Modal.Content.Body>
   *     Main Content
   *   </Modal.Content.Body>
   *   <Modal.Content.Footer>
   *     <Button>Footer Button</Button>
   *   </Modal.Content.Footer>
   * </Modal.Content>
   * ```
   */
  Content: typeof DialogContent & {
    /**
     * `Modal.Content.Header` represents the header section of the modal.
     *
     * @example
     * ```svelte
     * <Modal.Content.Header>
     *   Header Content
     *   <Modal.Content.Header.CloseButton {commandfor} command="close" />
     * </Modal.Content.Header>
     * ```
     */
    Header: typeof DialogContent.Header & {
      /**
       * `Modal.Content.Header.CloseButton` is a wrapper over `Button` meant to be used as a close button in modal headers.
       *
       * @example
       * ```svelte
       * <Modal.Content.Header.CloseButton {commandfor} command="close" />
       * ```
       */
      CloseButton: typeof DialogContent.Header.CloseButton;
    };
    /**
     * `Modal.Content.Body` represents the main content area of the modal.
     *
     * @example
     * ```svelte
     * <Modal.Content.Body>
     *   Main Content
     * </Modal.Content.Body>
     * ```
     */
    Body: typeof DialogContent.Body;
    /**
     * `Modal.Content.Footer` represents the footer section of the modal. Usually contains action buttons.
     *
     * @example
     * ```svelte
     * <Modal.Content.Footer>
     *   <Button>Cancel</Button>
     *   <Button>Confirm</Button>
     * </Modal.Content.Footer>
     * ```
     */
    Footer: typeof DialogContent.Footer;
  };
};

Modal.Content = DialogContent;

export * from "./types.js";
export { Modal };
