import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The modal title. It tells the user what triggered the modal.
   *
   * The title is deliberately not a heading element: the modal is a layer on
   * top of the page, not part of its document outline, so it names the dialog
   * through `aria-labelledby` instead.
   *
   */
  children?: ReactNode;
  /**
   * `id` set on the title element so the dialog can point its
   * `aria-labelledby` at it. Defaults to the id supplied by the Modal context;
   */
  titleId?: string;
  /**
   * Hides the close button, so the visible way out is an action in the footer.
   */
  undismissible?: boolean;
  /** Accessible name for the close button. */
  dismissLabel?: string;
  /**
   * Called when the close button is pressed. Defaults to closing the dialog
   * through the Modal's context; set it only to override that.
   */
  onDismiss?: () => void;
};

/**
 * Props for the Modal.Header subcomponent
 *
 * @implements ds:global.subcomponent.modal-header
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"header">, keyof OwnProps>;
