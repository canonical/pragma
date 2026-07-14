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
 * A Card is always a grid participant: `.ds.card` is a ROW SUBGRID that spans
 * four fixed section tracks (image / header / content / footer), inheriting them
 * from its parent grid. Standalone (wrapped in a `.grid`) it lays its own
 * sections out on those tracks; inside a `Cards` group it shares the group's
 * tracks so the same sections line up across every card in the row. See the
 * `Cards` group component for the full layout model.
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
