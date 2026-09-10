import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The main information the modal conveys — an open slot.
   */
  children?: ReactNode;
};

/**
 * Props for the Modal.Content subcomponent
 *
 * @implements ds:global.subcomponent.modal-content
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
