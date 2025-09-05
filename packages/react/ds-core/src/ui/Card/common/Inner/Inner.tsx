/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { InnerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "card-inner";

/**
 * Inner component for Card inner content
 */
const Inner = ({ className, ...props }: InnerProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
};

export default Inner;
