/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { TooltipMessageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tooltip-message";

/**
 * description of the TooltipMessage component
 * @returns {React.ReactElement} - Rendered TooltipMessage
 */
const TooltipMessage = ({
  id,
  children,
  className,
  style,
  ref,
  isOpen,
  zIndex,
}: TooltipMessageProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
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
      {children}
    </div>
  );
};

export default TooltipMessage;
