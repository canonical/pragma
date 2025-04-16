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
  positionElementId,
  positionElementClassName,
  messageElementId,
  messageElementClassName,
  children,
  style,
  ref,
  isOpen = false,
  zIndex,
  onPointerEnter,
  onFocus,
}: TooltipProps): React.ReactElement => {
  return (
    <div
      id={positionElementId}
      className={[componentCssClassName, positionElementClassName]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      aria-hidden={!isOpen}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      role="tooltip"
      style={{
        ...style,
        zIndex,
      }}
    >
      <div
        id={messageElementId}
        className={[messageElementClassName, "message"]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </div>
  );
};

export default Tooltip;
