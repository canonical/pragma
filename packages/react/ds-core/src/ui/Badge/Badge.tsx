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
  id,
  className,
  style,
  appearance = "neutral",
  value,
  overflowStrategy = "truncate",
}: BadgeProps): React.ReactElement => {
  const { displayValue, title } = useBadge({ value, overflowStrategy });

  return (
    <span
      id={id}
      style={style}
      title={title}
      className={[
        componentCssClassName,
        appearance !== "neutral" && appearance,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {displayValue}
    </span>
  );
};

export default Badge;
