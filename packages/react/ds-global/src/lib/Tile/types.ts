import type { HTMLAttributes, ReactElement } from "react";
import type { ContentProps } from "./common/Content/types.js";
import type { HeaderProps } from "./common/Header/types.js";

/**
 * Props for the Tile component
 *
 * @implements dso:global.component.tile
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - interaction.cursor: pointer
 * - appearance.background: color/surface/tile
 * - appearance.radius: radius/tile
 * - edges:
 *   - [0] tile-header (slotName: header, cardinality: 1)
 *   - [1] tile-content (slotName: default, cardinality: 1)
 */
export interface TileProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Tile.Header and Tile.Content elements
   * DOM order: Header first, Content second (per DSL edges)
   */
  children:
    | ReactElement<HeaderProps | ContentProps>
    | ReactElement<HeaderProps | ContentProps>[];
}

/**
 * Tile component type with attached subcomponents
 */
export type TileComponent = ((props: TileProps) => ReactElement) & {
  Header: (props: HeaderProps) => ReactElement;
  Content: (props: ContentProps) => ReactElement;
};
