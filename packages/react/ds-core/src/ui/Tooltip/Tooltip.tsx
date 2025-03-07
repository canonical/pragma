/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import "./styles.css";
import type { TooltipProps } from "./types.js";

const componentCssClassName = "ds tooltip";

/**
 * The Tooltip component is used to display a message.
 * This component is just the "message" part of the tooltip, and has no interactivity or positioning logic. It is generally not consumed directly, but rather in one of two ways
 * - The [TooltipArea](?path=/docs/tooltip-tooltiparea--docs) component
 * - The [withTooltip](?path=/docs/tooltip-withtooltip--docs) HOC
 */
const Tooltip = ({
  id,
  children,
  className,
  style,
  ref,
  isOpen = false,
  zIndex
}: TooltipProps): React.ReactElement => {
  return (
    <div
      className={[
        componentCssClassName,
        className
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      id={id}
      aria-hidden={!isOpen}
      role="tooltip"
      style={{
        ...style,
        visibility: isOpen ? "visible" : "hidden",
        zIndex,
      }}
    >
      <div className={`${componentCssClassName}__message`}>{children}</div>
    </div>
  );
};

export default Tooltip;
