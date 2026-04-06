import type { ReactElement } from "react";
import { FloatingAnchor } from "../../../FloatingAnchor/index.js";
import type { FloatingAnchorRenderContentProps } from "../../../FloatingAnchor/types.js";
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
  const renderTooltipContent = ({
    ref,
    id,
    isOpen,
    style: positionStyle,
    bestPosition,
    onPointerEnter,
    onFocus,
  }: FloatingAnchorRenderContentProps) => (
    <Tooltip
      id={id}
      className={[
        bestPosition?.positionName,
        messageElementClassName,
        autoFit && "autofit",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      ref={ref}
      style={{
        ...messageElementStyle,
        ...positionStyle,
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
    <FloatingAnchor
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      distance={distance}
      autoFit={autoFit}
      trigger="hover"
      ariaRelationship="describedby"
      targetElementId={targetElementId}
      targetElementClassName={targetElementClassName}
      targetElementStyle={targetElementStyle}
      parentElement={parentElement}
      renderContent={renderTooltipContent}
      {...props}
    >
      {children}
    </FloatingAnchor>
  );
};

export default TooltipArea;
