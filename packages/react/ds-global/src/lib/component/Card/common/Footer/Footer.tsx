import type React from "react";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-footer";

/**
 * Footer component for Card. A padded content-bearing section pinned to the
 * bottom of the card, for actions or supplementary information.
 *
 * @implements ds:global.subcomponent.card-footer
 */
const Footer = ({
  children,
  className,
  ...props
}: FooterProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

Footer.displayName = "Card.Footer";

export default Footer;
