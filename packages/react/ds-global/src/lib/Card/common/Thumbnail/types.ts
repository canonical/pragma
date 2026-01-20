import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Thumbnail
 *
 * @implements ds:global.subcomponent.card-thumbnail
 *
 * DSL anatomy:
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: start
 * - edges:
 *   - [0] image (cardinality: 1)
 *   - [1] content (cardinality: 0..1, slotName: default)
 */
export interface ThumbnailProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Props for the thumbnail image element (required)
   * Maps to DSL role: image (cardinality: 1)
   */
  imageProps: ImgHTMLAttributes<HTMLImageElement>;
  /**
   * Optional content to display alongside the thumbnail
   * Maps to DSL role: content (cardinality: 0..1, slotName: default)
   */
  children?: ReactNode;
}
