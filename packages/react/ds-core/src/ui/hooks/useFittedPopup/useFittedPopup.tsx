import { debounce } from "@canonical/utils";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FittedPopupPositioningStyles,
  Position,
  UseFittedPopupProps,
  UseFittedPopupResult,
} from "./types.js";

function useFittedPopup({
  preferredPositions = ["top", "bottom", "left", "right"],
  distance = "0px",
  gutter = "0px",
  defaultMaxWidth = "300px",
  debounceOpts,
}: UseFittedPopupProps): UseFittedPopupResult {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [chosenPosition, setChosenPosition] = useState<Position | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const id = useId();

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!targetRef.current || !messageRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const messageRect = messageRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const gutterValues = gutter
      .split(" ")
      .map((val) => Number.parseInt(val, 10));
    const topGutter = gutterValues[0] || 0;
    const rightGutter = gutterValues[1] || gutterValues[0] || 0;
    const bottomGutter = gutterValues[2] || gutterValues[0] || 0;
    const leftGutter =
      gutterValues[3] || gutterValues[1] || gutterValues[0] || 0;
    const distanceVal = Number.parseInt(distance, 10) || 0;

    for (const prefPos of preferredPositions) {
      const newPosition = { top: 0, left: 0 };
      let fits = true;

      switch (prefPos) {
        case "top":
          newPosition.left =
            targetRect.left + targetRect.width / 2 - messageRect.width / 2;
          newPosition.top = targetRect.top - messageRect.height - distanceVal;
          fits =
            newPosition.top >= topGutter &&
            newPosition.left >= leftGutter &&
            newPosition.left + messageRect.width <= windowWidth - rightGutter;
          break;
        case "bottom":
          newPosition.left =
            targetRect.left + targetRect.width / 2 - messageRect.width / 2;
          newPosition.top = targetRect.bottom + distanceVal;
          fits =
            newPosition.top + messageRect.height <=
              windowHeight - bottomGutter &&
            newPosition.left >= leftGutter &&
            newPosition.left + messageRect.width <= windowWidth - rightGutter;
          break;
        case "left":
          newPosition.left = targetRect.left - messageRect.width - distanceVal;
          newPosition.top =
            targetRect.top + targetRect.height / 2 - messageRect.height / 2;
          fits =
            newPosition.left >= leftGutter &&
            newPosition.top >= topGutter &&
            newPosition.top + messageRect.height <= windowHeight - bottomGutter;
          break;
        case "right":
          newPosition.left = targetRect.right + distanceVal;
          newPosition.top =
            targetRect.top + targetRect.height / 2 - messageRect.height / 2;
          fits =
            newPosition.left + messageRect.width <= windowWidth - rightGutter &&
            newPosition.top >= topGutter &&
            newPosition.top + messageRect.height <= windowHeight - bottomGutter;
          break;
        default:
          break;
      }

      if (fits) {
        setPosition(newPosition);
        setChosenPosition(prefPos);
        return;
      }
    }
    //If no position fits, default to top and left 0.
    setPosition({ top: 0, left: 0 });
    setChosenPosition(null);
  }, [preferredPositions, distance, gutter]);

  useEffect(() => {
    if (isVisible && targetRef.current && messageRef.current) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    if (!isVisible) return;
    const handleResize = debounce(() => {
      if (isVisible) {
        calculatePosition();
      }
    }, debounceOpts?.resize || 150);

    const handleScroll = debounce(() => {
      if (isVisible) {
        calculatePosition();
      }
    }, debounceOpts?.scroll || 150);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisible, calculatePosition, debounceOpts]);

  const messageStyle: FittedPopupPositioningStyles = useMemo(() => {
    return {
      maxWidth: defaultMaxWidth,
      position: "absolute",
      top: position.top,
      left: position.left,
      visibility: isVisible ? "visible" : "hidden",
    };
  }, [position, isVisible, defaultMaxWidth]);

  return {
    id,
    targetRef,
    messageRef,
    position,
    chosenPosition,
    isVisible,
    toggleVisibility,
    messageStyle,
  };
}

export default useFittedPopup;
