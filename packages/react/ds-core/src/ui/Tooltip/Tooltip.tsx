import type React from "react";
import { useId } from "react";
import {
  type FocusEventHandler,
  type PointerEventHandler,
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
    left?: string;
    top?: string;
  }>({});
  const targetRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibilityTimeout, setVisibilityTimeout] = useState<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const tooltipMessageId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const calculateMessagePosition = useCallback(() => {
    if (!targetRef.current || !messageRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const messageRect = messageRef.current.getBoundingClientRect();

    let xOffset = 0;
    let yOffset = 0;

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

    let adjustedXOffset = xOffset;
    let adjustedYOffset = yOffset;

    if (autoAdjust) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const absoluteX = targetRect.left + xOffset;
      const absoluteY = targetRect.top + yOffset;

      if (absoluteX < 0) adjustedXOffset -= absoluteX;
      else if (absoluteX + messageRect.width > viewportWidth)
        adjustedXOffset -= absoluteX + messageRect.width - viewportWidth;

      if (absoluteY < 0) adjustedYOffset -= absoluteY;
      else if (absoluteY + messageRect.height > viewportHeight)
        adjustedYOffset -= absoluteY + messageRect.height - viewportHeight;
    }
    setMessagePosition({
      top: `${adjustedYOffset}px`,
      left: `${adjustedXOffset}px`,
    });
  }, [position, autoAdjust]);

  useEffect(() => {
    calculateMessagePosition();
  }, [calculateMessagePosition]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) calculateMessagePosition();
    };

    const handleScroll = () => {
      if (isVisible) calculateMessagePosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisible, calculateMessagePosition]);

  useEffect(() => {
    if (isVisible && messageRef.current && isFocused) {
      const firstFocusableElement = messageRef.current.querySelector(
        '[tabIndex="0"], a, button, input, textarea, select',
      ) as HTMLElement;
      if (firstFocusableElement) firstFocusableElement.focus();
    }
  }, [isVisible, isFocused]);

  const replaceTimer = useCallback(
    (newTimer?: ReturnType<typeof setTimeout>) => {
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      setVisibilityTimeout(newTimer);
    },
    [visibilityTimeout],
  );

  const openTooltip = useCallback(() => {
    replaceTimer(
      setTimeout(() => {
        setIsVisible(true);
        setIsOpening(false);
      }, showDelay),
    );
  }, [showDelay, replaceTimer]);

  const closeTooltip = useCallback(() => {
    replaceTimer(
      setTimeout(() => {
        setIsVisible(false);
      }, hideDelay),
    );
  }, [hideDelay, replaceTimer]);

  const handleTriggerEnter: PointerEventHandler<HTMLDivElement> =
    useCallback(() => {
      openTooltip();
    }, [openTooltip]);

  const handleTriggerLeave: PointerEventHandler<HTMLDivElement> =
    useCallback(() => {
      closeTooltip();
    }, [closeTooltip]);

  const handleTriggerFocus = useCallback(() => {
    setIsFocused(true);
    // Avoid re-triggering focus if the tooltip is already open or in the process of opening
    if (!isVisible && !isOpening) {
      setIsOpening(true);
      openTooltip();
    }
  }, [isVisible, isOpening, openTooltip]);

  const handleTriggerBlur: FocusEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (
        event.relatedTarget &&
        targetRef.current?.contains(event.relatedTarget as Node)
      ) {
        return;
      }
      setIsFocused(false);
      closeTooltip();
    },
    [closeTooltip],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTooltip();
      }
    },
    [closeTooltip],
  );

  return (
    <div
      style={style}
      id={id}
      className={[componentCssClassName, className, POSITION_MAP[position]]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`${componentCssClassName}-target`}
        ref={targetRef}
        onPointerEnter={handleTriggerEnter}
        data-ds-tooltip-targeted={isVisible ? "true" : "false"}
        aria-describedby={tooltipMessageId}
        onPointerLeave={handleTriggerLeave}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
      >
        {children}
        <div
          className={`${componentCssClassName}-message`}
          ref={messageRef}
          id={tooltipMessageId}
          aria-hidden={!isVisible}
          role="tooltip"
          style={{
            ...messagePosition,
            zIndex,
          }}
          onPointerEnter={handleTriggerEnter}
          onPointerLeave={handleTriggerLeave}
        >
          {message}
        </div>
      </div>
    </div>
  );
};

export default Tooltip;
