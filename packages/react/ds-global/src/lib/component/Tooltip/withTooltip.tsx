import type {
  ComponentType,
  CSSProperties,
  FC,
  ReactElement,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDisclosure, useIsMounted } from "../../hooks/index.js";
import Tooltip from "./Tooltip.js";
import type { TooltipEngineProps, WithTooltipOptions } from "./types.js";

import "./styles.css";

const componentCssClassName = "ds tooltip-area";

/**
 * The tooltip engine: wraps a target element with a hover/focus tooltip. It
 * drives {@link useDisclosure} in `hover` mode, portals the message to the
 * client only, positions it against the target span, and points the arrow. This
 * is the shared implementation that {@link withTooltip} builds on — it renders
 * the wrapped component as its `children` target.
 */
const TooltipEngine = ({
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
}: TooltipEngineProps): ReactElement => {
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

/**
 * A higher-order component that wraps a component with a tooltip. It is the
 * single public tooltip primitive: it owns the engine (hover-mode
 * {@link useDisclosure}, client-only portal, arrow positioning) and renders the
 * wrapped component as the tooltip target.
 * @param Component The component type to wrap.
 * @param Message The content of the tooltip.
 * @param popupProps Tooltip options — positioning, sizing, timing, plus `open`,
 * `icon`, `distance`, `autoFit`, `messageElementStyle`, etc.
 */
const withTooltip = <TProps extends object>(
  Component: ComponentType<TProps>,
  Message: ReactNode,
  popupProps: WithTooltipOptions = {},
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement<TProps> => {
    return (
      <TooltipEngine Message={Message} {...popupProps}>
        <Component {...props} />
      </TooltipEngine>
    );
  };

  // Set the displayName for easier debugging
  WrappedComponent.displayName = `withTooltip(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default withTooltip;
