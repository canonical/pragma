import type React from "react";
import type { ThumbnailProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-thumbnail";

/**
 * Card.Thumbnail subcomponent
 *
 * Displays a small thumbnail image within a card, typically used alongside
 * content for logo/icon representation.
 *
 * DSL anatomy:
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: start
 * - edges: [0] image, [1] content (optional)
 *
 * @implements ds:global.subcomponent.card-thumbnail
 */
const Thumbnail = ({
  className,
  imageProps,
  children,
  ...props
}: ThumbnailProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* edges[0]: image (cardinality: 1) */}
    <img className="image" alt={imageProps.alt} {...imageProps} />

    {/* edges[1]: content (cardinality: 0..1, slotName: default) */}
    {children && <div className="content">{children}</div>}
  </div>
);

Thumbnail.displayName = "Card.Thumbnail";

export default Thumbnail;
