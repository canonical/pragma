import type React from "react";
import "./styles.css";
import type { TooltipProps } from "./types.js";

// The `contrasted` surface makes the tooltip invert against the ambient theme
// for greater contrast against its context.
const componentCssClassName = "ds tooltip contrasted";

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
  icon,
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
      {/* The icon+text row lives in an inner wrapper so the arrow `::before`
          on the outer box is never a flex item (which would displace it). */}
      <span className="content">
        {/* The optional icon always precedes the text (Figma), decorative only. */}
        {icon ? (
          <span className="icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="text">{children}</span>
      </span>
    </div>
  );
};

export default Tooltip;
