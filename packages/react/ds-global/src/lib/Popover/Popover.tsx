import type { ReactElement } from "react";
import { FloatingAnchor } from "../FloatingAnchor/index.js";
import type { FloatingAnchorRenderContentProps } from "../FloatingAnchor/types.js";
import type { PopoverProps } from "./types.js";

import "./styles.css";

const componentCssClassName = "ds popover";

/**
 * Click-triggered popover anchored to a target element.
 * Composes `FloatingAnchor` (portal + positioning) with a
 * `role="dialog"` floating panel.
 */
const Popover = ({
  children,
  content,
  contentClassName,
  contentStyle,
  distance = "6px",
  ...floatingAnchorProps
}: PopoverProps): ReactElement => {
  const renderPopoverPanel = ({
    ref,
    id,
    isOpen,
    style: positionStyle,
    onPointerEnter,
    onFocus,
  }: FloatingAnchorRenderContentProps) => (
    <div
      className={[componentCssClassName, contentClassName]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      id={id}
      aria-hidden={!isOpen}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      role="dialog"
      style={{
        ...contentStyle,
        ...positionStyle,
        visibility: isOpen ? "visible" : "hidden",
      }}
    >
      {content}
    </div>
  );

  return (
    <FloatingAnchor
      trigger="click"
      ariaRelationship="controls"
      distance={distance}
      renderContent={renderPopoverPanel}
      {...floatingAnchorProps}
    >
      {children}
    </FloatingAnchor>
  );
};

export default Popover;
