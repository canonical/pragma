/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import { Content, Header, Image, Thumbnail } from "./common/index.js";
import type { CardProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card";

/**
 * The card component is a rigid, repeatable container used to represent
 * specific data objects within a collection. Unlike the flexible Tile, a
 * card follows a strict internal structure to ensure that when multiple
 * cards are displayed together, the user can scan and compare attributes
 * across the set with minimal cognitive effort.
 *
 * @implements ds:global.component.card
 */
const Card = ({
  className,
  children,
  emphasis = "neutral",
  ...props
}: CardProps): React.ReactElement => (
  <div
    className={[componentCssClassName, emphasis, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </div>
);

Card.Content = Content;
Card.Header = Header;
Card.Image = Image;
Card.Thumbnail = Thumbnail;

export default Card;
