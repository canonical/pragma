/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { TooltipTriggerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tooltip-trigger";

/**
 * description of the TooltipTrigger component
 * @returns {React.ReactElement} - Rendered TooltipTrigger
 */
const TooltipTrigger = ({
  id,
  children,
  className,
  style,
  ref,
  messageId,
  isOpen,
  onBlur,
  onFocus,
  onPointerEnter,
  onPointerLeave,
}: TooltipTriggerProps): React.ReactElement => {
  return (
    <div
      id={id}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      ref={ref}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
      onFocus={onFocus}
      aria-describedby={isOpen ? messageId : undefined}
    >
      {children}
    </div>
  );
};

export default TooltipTrigger;
