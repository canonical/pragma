import type { CSSProperties, ReactElement } from "react";
import { createPortal } from "react-dom";
import { useDisclosure, useIsMounted } from "../../../../hooks/index.js";
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
  icon,
  open,
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
    // `open` is the public alias for the hook's controlled `isOpen`; when set it
    // overrides hover/focus so the tooltip stays in the given state.
  } = useDisclosure({
    distance,
    autoFit,
    ...props,
    isOpen: open ?? props.isOpen,
    mode: "hover",
  });

  const triggerProps = getToggleProps();
  const contentProps = getContentProps();

  // The message is portalled to the client only. Rendering it on the server (or
  // on the first client render) would differ from the post-mount portal output
  // and force a hydration mismatch + full re-mount — which resets the fitment
  // refs to null and re-triggers the unpositioned first frame. Deferring to a
  // mounted gate makes the server and first client render identical (nothing
  // at the call site); the tooltip mounts once, cleanly, after hydration.
  const mounted = useIsMounted();

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
      icon={icon}
      onPointerEnter={contentProps.onPointerEnter}
      ref={popupRef}
      style={{
        ...messageElementStyle,
        ...popupPositionStyle,
        ...arrowStyle,
      }}
      // Reveal only once a position has been resolved. Until `bestPosition`
      // exists the popup would render at the fallback top:0/left:0 with no
      // placement class (and so no arrow); gating the reveal on it means that
      // unpositioned frame stays `visibility:hidden` and never paints — no
      // visible 0,0 flash, and the open fade always runs from an anchored spot.
      isOpen={isOpen && Boolean(bestPosition)}
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
        The tooltip is portalled out of the flow (so it escapes scrollable or
        clipping ancestors) and only after mount, so SSR and the first client
        render agree (both emit nothing here).
      */}
      {mounted
        ? createPortal(TooltipMessageElement, parentElement || document.body)
        : null}
    </span>
  );
};

export default TooltipArea;
