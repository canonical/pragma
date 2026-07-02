import type React from "react";
import "./styles.css";
import type { TooltipProps } from "./types.js";

const componentCssClassName = "ds tooltip";

/**
 * The Tooltip component renders the message part of a tooltip. It has no
 * interactivity or positioning logic and is generally consumed via
 * TooltipArea or the withTooltip HOC.
 *
 * @implements ds:global.component.tooltip
 */
const Tooltip = ({
  id,
  children,
  className,
  style,
  ref,
  isOpen = false,
  zIndex,
  onPointerEnter,
  onFocus,
}: TooltipProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      ref={ref}
      id={id}
      aria-hidden={!isOpen}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      role="tooltip"
      style={{
        ...style,
        visibility: isOpen ? "visible" : "hidden",
        zIndex,
      }}
    >
      {children}
    </div>
  );
};

export default Tooltip;
