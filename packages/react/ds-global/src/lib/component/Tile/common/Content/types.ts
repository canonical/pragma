import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * Content to display in the tile body
   */
  children: ReactNode;
};

/**
 * Props for the Tile.Content subcomponent
 *
 * @implements ds:global.subcomponent.tile-content
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - spacing.internal: spacing/medium
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
