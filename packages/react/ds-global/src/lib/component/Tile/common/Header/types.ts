import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * Header content
   */
  children: ReactNode;
};

/**
 * Props for the Tile.Header subcomponent
 *
 * @implements ds:global.subcomponent.tile-header
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: center
 * - spacing.internal: spacing/medium
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
