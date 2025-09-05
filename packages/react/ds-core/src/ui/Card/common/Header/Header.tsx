/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "card-header";

/**
 * Header component for Card headers
 */
const Header = ({ className, ...props }: HeaderProps): React.ReactElement => {
  return (
    <header
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
};

export default Header;
