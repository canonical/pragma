/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { CardHeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "header";

/**
 * CardHeader component for Card headers
 */
const CardHeader = ({
  className,
  ...props
}: CardHeaderProps): React.ReactElement => {
  return (
    <header
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
};

export default CardHeader;
