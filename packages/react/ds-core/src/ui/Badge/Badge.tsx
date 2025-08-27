/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { BadgeProps } from "./types.js";
import "./styles.css";
import useBadge from "./hooks/useBadge.js";

const componentCssClassName = "ds badge";

/**
 * description of the Badge component
 * @returns {React.ReactElement} - Rendered Badge
 * @implements syntax:core:component:badge:1.0.0
 */
const Badge = ({
  value,
  className,
  appearance,
  overflowStrategy = "truncate",
  itemOptions,
  ...props
}: BadgeProps): React.ReactElement => {
  const { displayValue, title } = useBadge({
    value,
    overflowStrategy,
    itemOptions,
  });

  return (
    <span
      title={title}
      className={[componentCssClassName, appearance, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {displayValue}
    </span>
  );
};

export default Badge;
