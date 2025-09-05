/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import { useId, useMemo } from "react";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "card-header";

/**
 * Header component for Card headers
 */
const Header = ({
  children,
  className,
  ...props
}: HeaderProps): React.ReactElement => {
  const titleId = useMemo(() => props.id || useId(), [props.id]);

  return (
    <h3
      id={titleId}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </h3>
  );
};

export default Header;
