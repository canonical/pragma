import type React from "react";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tile-header";

/**
 * Tile.Header subcomponent
 *
 * Header area for a Tile, displayed at the top.
 *
 * @implements ds:global.subcomponent.tile-header
 */
const Header = ({
  children,
  className,
  ...props
}: HeaderProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

Header.displayName = "Tile.Header";

export default Header;
