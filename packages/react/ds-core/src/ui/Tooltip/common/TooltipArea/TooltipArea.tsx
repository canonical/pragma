import type React from "react";
import type { ReactElement } from "react";
import { usePopup } from "../../../hooks/index.js";
import { Tooltip } from "../../index.js";
import type { TooltipAreaProps } from "./types.js";

import "./styles.css";
import { createPortal } from "react-dom";

const componentCssClassName = "ds tooltip-area";

/**
 * Wraps a target element with a tooltip.
 * This component allows you to attach a tooltip to any JSX fragment.
 */
const TooltipArea = ({
  children,
  Message,
  distance = "6px",
  targetElementId,
  targetElementClassName,
  targetElementStyle,
  messageElementClassName,
  messageElementStyle,
  parentElement,
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

  const TooltipMessageElement = (
    <Tooltip
      id={popupId}
      className={[bestPosition?.positionName, messageElementClassName]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={handleTriggerEnter}
      onFocus={handleTriggerFocus}
      ref={popupRef}
      style={{
        ...messageElementStyle,
        ...popupPositionStyle,
        // @ts-ignore allow binding arrow size to distance, as it is needed both in JS and CSS calculations
        "--tooltip-spacing-arrow-size": distance,
      }}
      isOpen={isOpen}
    >
      {Message}
    </Tooltip>
  );

  return (
    <span
      className={[componentCssClassName].filter(Boolean).join(" ")}
      onFocus={handleTriggerFocus}
      onBlur={handleTriggerBlur}
      onPointerEnter={handleTriggerEnter}
      onPointerLeave={handleTriggerLeave}
    >
      <span
        id={targetElementId}
        className={[componentCssClassName, targetElementClassName, "target"]
          .filter(Boolean)
          .join(" ")}
        ref={targetRef}
        aria-describedby={popupId}
      >
        {children}
      </span>
      {/*
        Portal can only be rendered on the client
      */}
      {typeof window !== "undefined"
        ? // Portals allow the tooltip to be rendered outside the parent element
          // This is helpful when the parent element is a scrollable container or has bounds that may be
          // overflown by the tooltip message.
          createPortal(TooltipMessageElement, parentElement || document.body)
        : TooltipMessageElement}
    </span>
  );
};

export default TooltipArea;
