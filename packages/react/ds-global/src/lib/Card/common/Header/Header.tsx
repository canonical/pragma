import type React from "react";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-header";

/**
 * Header component for Card
 *
 * @implements ds:global.subcomponent.card-header
 */
const Header = ({
  children,
  className,
  ...props
}: HeaderProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

Header.displayName = "Card.Header";

export default Header;
