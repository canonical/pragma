import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The actions that capture the user's decision — normally Buttons, with the
   * affirmative one last.
   * Maps to DSL edges[0]: button (cardinality: 0..*)
   */
  children?: ReactNode;
};

/**
 * Props for the Modal.Footer subcomponent
 *
 * @implements ds:global.subcomponent.modal-footer
 */
export type FooterProps = OwnProps &
  Omit<ComponentProps<"footer">, keyof OwnProps>;
