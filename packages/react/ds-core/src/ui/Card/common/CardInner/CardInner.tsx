/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { CardInnerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "inner";

/**
 * CardInner component for Card inner content
 */
const CardInner = ({
  className,
  ...props
}: CardInnerProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
};

export default CardInner;
