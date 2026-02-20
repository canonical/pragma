import type React from "react";
import type { BadgeProps } from "./types.js";
import "./styles.css";
import useBadge from "./hooks/useBadge.js";

const componentCssClassName = "ds badge";

/**
 * description of the Badge component
 * @implements ds:global.component.badge
 */
const Badge = ({
  value,
  className,
  severity,
  humanizeOptions,
  pluralizeOptions,
  ...props
}: BadgeProps): React.ReactElement => {
  const { displayValue, title } = useBadge({
    value,
    humanizeOptions,
    pluralizeOptions,
  });

  return (
    <span
      title={title}
      className={[componentCssClassName, severity, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {displayValue}
    </span>
  );
};

export default Badge;
