import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The main information the modal conveys — an open slot.
   * Maps to DSL edges[0]: content (cardinality: 1)
   */
  children?: ReactNode;
};

/**
 * Props for the Modal.Content subcomponent
 *
 * @implements dso:global.subcomponent.modal-content
 *
 * Anatomy (from DSL):
 * - layout.overflow: scroll
 * - layout.flex: 1
 * - spacing.internal: spacing/large
 * - edges:
 *   - [0] content (cardinality: 1, slotName: default)
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
