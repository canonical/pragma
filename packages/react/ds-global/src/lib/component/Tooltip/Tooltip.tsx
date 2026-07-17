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
  children,
  icon,
  className,
  style,
  isOpen = false,
  zIndex,
  ...props
}: TooltipProps): React.ReactElement => {
  return (
    // Native props (id, ref, onPointerEnter, onFocus, …) are spread first; the
    // DS-controlled attributes (role, aria-hidden, merged className/style) come
    // after so they win.
    <div
      {...props}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      role="tooltip"
      aria-hidden={!isOpen}
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
