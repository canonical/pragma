import React, { type ReactElement } from "react";
import { usePopup } from "../../../hooks/index.js";
import { Tooltip } from "../../index.js";
import type { TooltipAreaProps } from "./types.js";

import "./styles.css";

const componentCssClassName = "ds tooltip-area";

/**
 * Wraps a target element with a tooltip.
 * This component allows you to attach a tooltip to any JSX fragment.
 *

 */
const TooltipArea = ({
  children,
  Message,
  distance = 6,
  ...props
}: TooltipAreaProps): ReactElement => {
  const {
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    isOpen,
    handleTriggerFocus,
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerLeave,
    bestPosition,
  } = usePopup({ distance, ...props });

  return (
    <div
      className={[componentCssClassName].filter(Boolean).join(" ")}
      onFocus={handleTriggerFocus}
      onBlur={handleTriggerBlur}
      onPointerEnter={handleTriggerEnter}
      onPointerLeave={handleTriggerLeave}
    >
      <div
        className={[`${componentCssClassName}__target`]
          .filter(Boolean)
          .join(" ")}
        ref={targetRef}
        aria-describedby={isOpen ? popupId : undefined}
      >
        {children}
      </div>

      <Tooltip
        className={bestPosition?.positionName}
        ref={popupRef}
        style={{
          ...popupPositionStyle,
          // @ts-ignore allow binding arrow size to distance, as it is needed both in JS and CSS calculations
          "--tooltip-spacing-arrow-size": `${distance}px`,
        }}
        isOpen={isOpen}
      >
        {Message}
      </Tooltip>
    </div>
  );
};

export default TooltipArea;

// Proposed folder change:
// /Tooltip/Tooltip.tsx (the message) - change this file to the message
// /Tooltip/withTooltip (the hoc) - This can be moved to the same folder as the message

// HOC wraps the custom component instead

//withTooltip -> TooltipArea -> <parent><target/> <tooltip/></parent>
