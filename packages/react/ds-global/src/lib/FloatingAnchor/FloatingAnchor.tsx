import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { usePopup } from "../hooks/index.js";
import type { FloatingAnchorProps } from "./types.js";

import "./styles.css";

const componentCssClassName = "ds floating-anchor";

/**
 * A generic primitive that anchors floating content (tooltips, popovers, menus)
 * to a target element, handling positioning via a portal and interaction via `usePopup`.
 *
 * Consumers control what is rendered in the floating layer by passing either
 * `content` (simple) or `renderContent` (full control via render prop).
 */
const FloatingAnchor = ({
  children,
  content,
  renderContent,
  style,
  className,
  targetElementId,
  targetElementClassName,
  targetElementStyle,
  contentClassName,
  contentStyle,
  parentElement,
  ariaRelationship = "describedby",
  trigger = "hover",
  autoFit,
  distance = "0px",
  ...popupProps
}: FloatingAnchorProps): ReactElement => {
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
    handleTriggerClick,
    bestPosition,
  } = usePopup({ distance, autoFit, trigger, ...popupProps });

  const floatingElement = renderContent ? (
    renderContent({
      ref: popupRef,
      id: popupId,
      isOpen,
      style: { position: "fixed", ...contentStyle, ...popupPositionStyle },
      bestPosition,
      onPointerEnter: handleTriggerEnter,
      onFocus: handleTriggerFocus,
    })
  ) : (
    <div
      ref={popupRef}
      id={popupId}
      className={["ds floating-anchor-content", contentClassName]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...contentStyle,
        ...popupPositionStyle,
        visibility: isOpen ? "visible" : "hidden",
      }}
      aria-hidden={!isOpen}
      onPointerEnter={trigger === "hover" ? handleTriggerEnter : undefined}
      onFocus={trigger === "hover" ? handleTriggerFocus : undefined}
    >
      {content}
    </div>
  );

  // --- Build ARIA attributes for the anchor ---
  const anchorAriaProps: Record<string, string | boolean | undefined> = {};
  if (ariaRelationship === "describedby") {
    anchorAriaProps["aria-describedby"] = popupId;
  } else if (ariaRelationship === "controls") {
    anchorAriaProps["aria-controls"] = popupId;
    anchorAriaProps["aria-expanded"] = isOpen;
  }

  // --- Event handlers based on trigger mode ---
  const isHover = trigger === "hover";
  const isClick = trigger === "click";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Generic anchor must support both hover and click trigger modes
    <span
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      onFocus={isHover ? handleTriggerFocus : undefined}
      onBlur={isHover ? handleTriggerBlur : undefined}
      onPointerEnter={isHover ? handleTriggerEnter : undefined}
      onPointerLeave={isHover ? handleTriggerLeave : undefined}
      onClick={isClick ? handleTriggerClick : undefined}
      onKeyDown={
        isClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleTriggerClick(e as unknown as React.MouseEvent<Element>);
              }
            }
          : undefined
      }
    >
      <span
        id={targetElementId}
        style={targetElementStyle}
        className={["target", targetElementClassName].filter(Boolean).join(" ")}
        ref={targetRef}
        {...anchorAriaProps}
      >
        {children}
      </span>
      {typeof window !== "undefined"
        ? createPortal(floatingElement, parentElement || document.body)
        : floatingElement}
    </span>
  );
};

export default FloatingAnchor;
