import type React from "react";
import { Content, Footer, Header, Image, Thumbnail } from "./common/index.js";
import type { CardProps } from "./types.js";
import "./styles.css";

// The Card establishes its own `.surface` context so its background steps when
// nested inside another surface or card.
const componentCssClassName = "ds card surface";

/**
 * The card is a container that is designed to represent data objects that share
 * the same structure. Unlike the more flexible Tile, a card is designed to have
 * multiple units displayed beside one another. Because of this, the card has a
 * predictable structure that allows the user to compare attributes across data
 * objects.
 *
 * @implements dso:global.component.card
 */
const Card = ({
  className,
  children,
  ...props
}: CardProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

Card.Content = Content;
Card.Footer = Footer;
Card.Header = Header;
Card.Image = Image;
Card.Thumbnail = Thumbnail;

export default Card;
