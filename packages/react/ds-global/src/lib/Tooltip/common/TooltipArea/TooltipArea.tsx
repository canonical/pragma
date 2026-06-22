import type { ReactElement } from "react";
import { useIsMounted, usePopup } from "../../../hooks/index.js";
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
    handleTriggerFocus,
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerLeave,
    bestPosition,
  } = usePopup({ distance, autoFit, ...props });

  const isMounted = useIsMounted();

  const TooltipMessageElement = (
    <Tooltip
      id={popupId}
      className={[
        bestPosition?.positionName,
        messageElementClassName,
        autoFit && "autofit",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={handleTriggerEnter}
      onFocus={handleTriggerFocus}
      ref={popupRef}
      style={{
        ...messageElementStyle,
        ...popupPositionStyle,
        // @ts-expect-error allow binding arrow size to distance, as it is needed both in JS and CSS calculations
        "--tooltip-spacing-arrow-size": distance,
        ...(autoFit &&
          bestPosition?.autoFitOffset && {
            "--tooltip-arrow-offset-top": `${bestPosition?.autoFitOffset.top || 0}px`,
            "--tooltip-arrow-offset-left": `${bestPosition?.autoFitOffset.left || 0}px`,
          }),
      }}
      isOpen={isOpen}
    >
      {Message}
    </Tooltip>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: TODO this is kept as is to prevent breaking changes
    <span
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      onFocus={handleTriggerFocus}
      onBlur={handleTriggerBlur}
      onPointerEnter={handleTriggerEnter}
      onPointerLeave={handleTriggerLeave}
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
        Portals allow the tooltip to be rendered outside the parent element.
        This is helpful when the parent element is a scrollable container or
        has bounds that may be overflown by the tooltip message.

        The portal can only attach on the client, and the first client render
        must produce the same tree as the server HTML for hydration to
        succeed — so the message stays inline until the component has mounted.
      */}
      {isMounted
        ? createPortal(TooltipMessageElement, parentElement || document.body)
        : TooltipMessageElement}
    </span>
  );
};

export default TooltipArea;
