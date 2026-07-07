import type { CSSProperties, ReactElement } from "react";
import { createPortal } from "react-dom";
import { useDisclosure } from "#lib/hooks/index.js";
import { Tooltip } from "../../index.js";
import type { TooltipAreaProps } from "./types.js";

import "./styles.css";

const componentCssClassName = "ds tooltip-area";

/**
 * Wraps a target element with a tooltip.
 * This component allows you to attach a tooltip to any JSX fragment.
 */
const TooltipArea = ({
  children,
  style,
  className,
  Message,
  distance = "6px",
  targetElementId,
  targetElementClassName,
  targetElementStyle,
  messageElementClassName,
  messageElementStyle,
  parentElement,
  autoFit,
  ...props
}: TooltipAreaProps): ReactElement => {
  const {
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    isOpen,
    bestPosition,
    arrowOffset,
    getToggleProps,
    getContentProps,
  } = useDisclosure({ distance, autoFit, ...props, mode: "hover" });

  const triggerProps = getToggleProps();
  const contentProps = getContentProps();

  // The always-on arrow offset keeps the arrow pointing at the target centre
  // for every placement, not only when auto-fit clamps.
  const arrowStyle: CSSProperties = arrowOffset
    ? {
        [arrowOffset.axis === "x"
          ? "--tooltip-arrow-offset-left"
          : "--tooltip-arrow-offset-top"]: `${arrowOffset.offset}px`,
      }
    : {};

  const TooltipMessageElement = (
    <Tooltip
      id={popupId}
      className={[bestPosition?.positionName, messageElementClassName]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={contentProps.onPointerEnter}
      ref={popupRef}
      style={{
        ...messageElementStyle,
        ...popupPositionStyle,
        ...arrowStyle,
      }}
      isOpen={isOpen}
    >
      {Message}
    </Tooltip>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the wrapper forwards pointer/focus to the tooltip trigger
    <span
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      onFocus={triggerProps.onFocus}
      onBlur={triggerProps.onBlur}
      onPointerEnter={triggerProps.onPointerEnter}
      onPointerLeave={triggerProps.onPointerLeave}
    >
      <span
        id={targetElementId}
        style={targetElementStyle}
        className={["target", targetElementClassName].filter(Boolean).join(" ")}
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
