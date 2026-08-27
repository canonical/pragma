import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Modal.Header subcomponent
 *
 * @implements dso:global.subcomponent.modal-header
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: center
 * - layout.justify: space-between
 * - spacing.internal: spacing/medium
 * - appearance.border.bottom: border/style/divider
 * - edges:
 *   - [0] title (cardinality: 1, slotName: default)
 *   - [1] close button (cardinality: 0..1)
 */
export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /**
   * The modal title. It tells the user what triggered the modal.
   * Maps to DSL edges[0]: title (cardinality: 1)
   */
  children?: ReactNode;
  /**
   * `id` set on the title element so the dialog can point its
   * `aria-labelledby` at it. Defaults to the id supplied by the Modal context;
   * you rarely set this yourself.
   */
  titleId?: string;
  /**
   * Whether to render the close button, letting the user leave without making a
   * decision. Maps to DSL edges[1]: close button (cardinality: 0..1)
   */
  dismissible?: boolean;
  /** Accessible name for the close button. */
  dismissLabel?: string;
  /**
   * Called when the close button is pressed. Defaults to the dismissal reported
   * through the Modal's `onOpenChange`; set it only to override that.
   */
  onDismiss?: () => void;
}
