import type React from "react";
import { useId } from "react";
import {
  type FocusEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TooltipProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tooltip";

export const POSITION_MAP = {
  btmCenter: "btm-center",
  btmLeft: "btm-left",
  btmRight: "btm-right",
  left: "left",
  right: "right",
  topCenter: "top-center",
  topLeft: "top-left",
  topRight: "top-right",
} as const;

/** Size of the arrow in px */
const ARROW_SIZE = 8;

const Tooltip = ({
  id,
  message,
  children,
  className,
  style,
  position = "topCenter",
  autoAdjust = false,
  zIndex = 1000,
  showDelay = 350,
  hideDelay = 350,
}: TooltipProps): React.ReactElement => {
  const [messagePosition, setMessagePosition] = useState<{
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  }>({ left: 0, right: 0, top: 0, bottom: 0 });
  const targetRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [visibilityTimeout, setVisibilityTimeout] = useState<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const tooltipMessageId = useId();

  const calculateMessagePosition = useCallback(() => {
    if (!targetRef.current || !messageRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const messageRect = messageRef.current.getBoundingClientRect();

    let xOffset = 0;
    let yOffset = 0;

    // vertical positioning offsets
    switch (position) {
      case "topCenter":
      case "topRight":
      case "topLeft":
        yOffset = -(messageRect.height + ARROW_SIZE);
        break;
      case "btmCenter":
      case "btmRight":
      case "btmLeft":
        yOffset = targetRect.height + ARROW_SIZE;
        break;
      case "left":
      case "right":
        yOffset = (targetRect.height - messageRect.height) / 2;
        break;
    }

    // horizontal positioning offsets
    switch (position) {
      case "topCenter":
      case "btmCenter":
        xOffset = (targetRect.width - messageRect.width) / 2;
        break;
      case "left":
        xOffset = -(messageRect.width + ARROW_SIZE);
        break;
      case "right":
        xOffset = targetRect.width + ARROW_SIZE;
        break;
      case "topRight":
      case "btmRight":
        xOffset = targetRect.width - messageRect.width + ARROW_SIZE;
        break;
      case "topLeft":
      case "btmLeft":
        xOffset = -ARROW_SIZE;
        break;
    }

    if (autoAdjust) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const absoluteX = targetRect.left + xOffset;
      const absoluteY = targetRect.top + yOffset;

      if (absoluteX < 0) xOffset -= absoluteX;
      else if (absoluteX + messageRect.width > viewportWidth)
        xOffset -= absoluteX + messageRect.width - viewportWidth;

      if (absoluteY < 0) yOffset -= absoluteY;
      else if (absoluteY + messageRect.height > viewportHeight)
        yOffset -= absoluteY + messageRect.height - viewportHeight;
    }

    setMessagePosition({ top: yOffset, left: xOffset });
  }, [position, autoAdjust]);

  // On receiving hover or focus, calculate the position of the message
  useEffect(() => {
    calculateMessagePosition();

    const handleResize = () => {
      if (isHovered) calculateMessagePosition();
    };

    const handleScroll = () => {
      if (isHovered) calculateMessagePosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHovered, calculateMessagePosition]);

  // Store a single instance of a timer, so only one timer is active at a time
  const replaceTimer = (newTimer?: ReturnType<typeof setTimeout>) => {
    if (visibilityTimeout) clearTimeout(visibilityTimeout);
    setVisibilityTimeout(newTimer);
  };

  const openTooltip = (autofocus = false) => {
    replaceTimer(
      setTimeout(() => {
        setIsVisible(true);

        if (autofocus && messageRef.current) {
          const firstFocusableElement = messageRef.current.querySelector(
            '[tabIndex="0"], a, button, input, textarea, select',
          ) as HTMLElement;

          // Focus the first focusable element in the tooltip.
          // We need to wait a little bit for the tooltip to be visible before we can focus
          replaceTimer(
            setTimeout(() => {
              if (firstFocusableElement) firstFocusableElement.focus();
            }, 10),
          );
        }
      }, showDelay),
    );
  };

  const closeTooltip = () => {
    replaceTimer(
      setTimeout(() => {
        setIsVisible(false);
      }, hideDelay),
    );
  };

  const handleTriggerMouseEnter = () => {
    setIsHovered(true);
    openTooltip();
  };

  const handleTriggerMouseLeave = () => {
    setIsHovered(false);
    closeTooltip();
  };

  const handleTooltipMouseEnter = () => {
    replaceTimer();

    setIsHovered(true);
    setIsVisible(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsHovered(false);
  };

  const handleTriggerFocus = () => {
    // Do not re-focus if already focused, to avoid repeatedly focusing the same element
    if (isFocused) return;

    setIsFocused(true);
    openTooltip(true);
  };

  const handleTriggerBlur: FocusEventHandler<HTMLSpanElement> = (event) => {
    // If focus is moving to an element that is within the tooltip target, ignore the blur event
    if (
      event.relatedTarget &&
      targetRef?.current?.contains(event.relatedTarget as Node)
    ) {
      event.preventDefault();
      return;
    }
    setIsFocused(false);
    closeTooltip();
  };

  return (
    <span
      style={style}
      id={id}
      className={[componentCssClassName, className, POSITION_MAP[position]]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`${componentCssClassName}-target`}
        ref={targetRef}
        onMouseEnter={handleTriggerMouseEnter}
        data-ds-tooltip-targeted={isVisible ? "true" : "false"}
        aria-describedby={tooltipMessageId}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
      >
        {children}
        <span
          className={`${componentCssClassName}-message`}
          ref={messageRef}
          id={tooltipMessageId}
          aria-hidden={!isVisible}
          style={{
            ...messagePosition,
            zIndex,
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {message}
        </span>
      </span>
    </span>
  );
};

export default Tooltip;
