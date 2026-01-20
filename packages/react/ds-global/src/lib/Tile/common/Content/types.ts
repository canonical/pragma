import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Tile.Content subcomponent
 *
 * @implements dso:global.subcomponent.tile-content
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - spacing.internal: spacing/medium
 */
export interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Content to display in the tile body
   */
  children: ReactNode;
}
