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
 * @implements dso:global.subcomponent.modal-footer
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.justify: end
 * - spacing.gap: spacing/small
 * - spacing.internal: spacing/medium
 * - appearance.border.top: border/style/divider
 * - edges:
 *   - [0] global.component.button (cardinality: 0..*, slotName: default)
 */
export type FooterProps = OwnProps &
  Omit<ComponentProps<"footer">, keyof OwnProps>;
