import type React from "react";
import type { LabelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds label";

/**
 * The label component is a compact, non-interactive visual element used to
 * categorize content or indicate a status. Its primary role is metadata
 * visualization. While it has similar visual properties to the Chip, it is
 * purely informational and does not trigger actions or allow for removal.
 *
 * @implements ds:global.component.label
 */
const Label = ({
  children,
  criticality,
  className,
  ...props
}: LabelProps): React.ReactElement => (
  <span
    className={[componentCssClassName, criticality, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </span>
);

export default Label;
