import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Tile.Header subcomponent
 *
 * @implements dso:global.subcomponent.tile-header
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: center
 * - spacing.internal: spacing/medium
 */
export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Header content
   */
  children: ReactNode;
}
