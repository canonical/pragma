import type React from "react";
import { Content, Footer, Header, Image } from "./common/index.js";
import type { CardProps } from "./types.js";
import "./styles.css";

// The Card is NOT a surface: it establishes no `.surface` context of its own,
// so on a surface it takes the same background (no step) and reads as flush
// with its container. It stays delimited by its border, radius, and the
// dividers between its sections.
const componentCssClassName = "ds card";

/**
 * The card is a container that is designed to represent data objects that share
 * the same structure. Unlike the more flexible Tile, a card is designed to have
 * multiple units displayed beside one another. Because of this, the card has a
 * predictable structure that allows the user to compare attributes across data
 * objects.
 *
 * `import { Card } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.component.card
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

export default Card;
