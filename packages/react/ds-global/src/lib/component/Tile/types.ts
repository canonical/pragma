import type { ComponentProps, ReactElement } from "react";
import type { ContentProps } from "./common/Content/types.js";
import type { HeaderProps } from "./common/Header/types.js";

type OwnProps = {
  /**
   * Tile.Header and Tile.Content elements
   * DOM order: Header first, Content second (per DSL edges)
   */
  children:
    | ReactElement<HeaderProps | ContentProps>
    | ReactElement<HeaderProps | ContentProps>[];
};

/**
 * Props for the Tile component
 *
 * @implements ds:global.component.tile
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - appearance.background: color/surface/tile (Tile is a surface)
 * - appearance.radius: radius/card (shared with Card)
 * - edges:
 *   - [0] tile-header (slotName: header, cardinality: 0..1)
 *   - [1] tile-content (slotName: default, cardinality: 1)
 */
export type TileProps = OwnProps & Omit<ComponentProps<"div">, keyof OwnProps>;

/**
 * Tile component type with attached subcomponents
 */
export type TileComponent = ((props: TileProps) => ReactElement) & {
  Header: (props: HeaderProps) => ReactElement;
  Content: (props: ContentProps) => ReactElement;
};
