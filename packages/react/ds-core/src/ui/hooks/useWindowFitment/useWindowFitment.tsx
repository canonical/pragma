import { debounce } from "@canonical/utils";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  BestPosition,
  PopupDirection,
  RelativePosition,
  UseWindowFitmentProps,
  UseWindowFitmentResult,
} from "./types.js";

function useWindowFitment({
  preferredDirections = ["top", "bottom", "left", "right"],
  distance = 0,
  gutter = "0px",
  maxWidth = "350px",
  resizeDelay = 150,
  scrollDelay = 150,
  onBestPositionChange,
}: UseWindowFitmentProps): UseWindowFitmentResult {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [bestPosition, setBestPosition] = useState<BestPosition | undefined>();

  /**
   * Calculate the relative position of the popup when oriented in a given direction.
   * @param direction The side of the target element to position the popup on.
   * @param targetRect The bounding client rect of the target element.
   * @param popupRect The bounding client rect of the popup element.
   * @returns The calculated absolute position of the popup.
   */
  const calculateRelativePosition = useCallback(
    (
      direction: PopupDirection,
      targetRect: DOMRect,
      popupRect: DOMRect,
    ): RelativePosition => {
      let left = 0;
      let top = 0;

      // horizontal
      switch (direction) {
        case "top":
        case "bottom":
          left = (targetRect.width - popupRect.width) / 2;
          break;
        case "right":
          left = targetRect.width + distance;
          break;
        case "left":
          left = -(popupRect.width + distance);
          break;
      }

      // vertical
      switch (direction) {
        case "top":
          top = -(popupRect.height + distance);
          break;
        case "bottom":
          top = targetRect.height + distance;
          break;
        case "right":
        case "left":
          top = (targetRect.height - popupRect.height) / 2;
          break;
      }

      return { left, top };
    },
    [distance],
  );

  /**
   * Check if the popup fits within the window. Accounts for `gutter` prop.
   * @param candidatePosition The calculated position of the popup.
   * @param popupRect The bounding client rect of the popup element.
   * @returns Whether the popup fits within the window.
   */
  const fitsInWindow = useCallback(
    (
      candidatePosition: RelativePosition,
      popupRect: DOMRect,
      targetRect: DOMRect,
    ): boolean => {
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

      // Bounds of the window, accounting for the gutter
      const bounds = {
        top: topGutter,
        left: leftGutter,
        right: windowWidth - rightGutter,
        bottom: windowHeight - bottomGutter,
      };

      // Convert candidatePosition to viewport-absolute
      const absolutePopupTop = targetRect.top + candidatePosition.top;
      const absolutePopupLeft = targetRect.left + candidatePosition.left;

      // Absolute position of the popup's vertices, relative to the viewport
      const vertices = {
        top: absolutePopupTop,
        right: absolutePopupLeft + popupRect.width,
        bottom: absolutePopupTop + popupRect.height,
        left: absolutePopupLeft,
      };

      return (
        vertices.top >= bounds.top &&
        vertices.right <= bounds.right &&
        vertices.bottom <= bounds.bottom &&
        vertices.left >= bounds.left
      );
    },
    [gutter],
  );

  /**
   * Find the best position for the popup based on the preferred directions.
   * @param targetRect The bounding client rect of the target element.
   * @param popupRect The bounding client rect of the popup element.
   * @returns The best position for the popup.
   */
  const findBestPosition = useCallback(
    (targetRect: DOMRect, popupRect: DOMRect): BestPosition => {
      let fallbackPosition: BestPosition | undefined = undefined;

      if (!preferredDirections.length) {
        throw new Error("Preferred directions must not be empty.");
      }

      for (const positionName of preferredDirections) {
        const relativePosition = calculateRelativePosition(
          positionName,
          targetRect,
          popupRect,
        );
        const bestPositionForName: BestPosition = {
          positionName: positionName,
          position: relativePosition,
          fits: fitsInWindow(relativePosition, popupRect, targetRect),
        };

        // Save the calculated position as a fallback in case no other position fits.
        fallbackPosition ||= bestPositionForName;

        // If this position fits, use it.
        // if (bestPositionForName.fits) {
        //   console.log("fits", bestPositionForName);
        //   return bestPositionForName;
        // } else {
        //   console.log("does not fit", bestPositionForName);
        // }
      }

      console.log("fallback", fallbackPosition);
      // biome-ignore lint/style/noNonNullAssertion: Fallback position is always defined here, due to the loop above and the thrown error if preferredDirections is empty.
      return fallbackPosition!;
    },
    [preferredDirections, calculateRelativePosition, fitsInWindow],
  );

  const calculatePosition = useCallback(() => {
    console.log("calculatePosition");
    if (!targetRef.current || !popupRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const popupRect = popupRef.current.getBoundingClientRect();

    setBestPosition((prevBestPosition) => {
      const newBestPosition = findBestPosition(targetRect, popupRect);
      if (prevBestPosition?.positionName !== newBestPosition.positionName) {
        if (onBestPositionChange) {
          onBestPositionChange(newBestPosition);
        }
        return newBestPosition;
      }
    });
  }, [findBestPosition, onBestPositionChange]);

  // Recalculate position
  useEffect(() => {
    // Calculate initial position if the popup has not been positioned yet
    if (!bestPosition) {
      calculatePosition();
    }

    const handleResize = debounce(() => {
      calculatePosition();
    }, resizeDelay);

    const handleScroll = debounce(() => {
      calculatePosition();
    }, scrollDelay);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [calculatePosition, resizeDelay, scrollDelay, bestPosition]);

  const popupPositionStyle: CSSProperties = useMemo(
    () => ({
      maxWidth: maxWidth,
      position: "absolute",
      top: bestPosition?.position?.top || 0,
      left: bestPosition?.position?.left || 0,
    }),
    [bestPosition, maxWidth],
  );

  return {
    targetRef,
    popupRef,
    bestPosition,
    popupPositionStyle,
  };
}

export default useWindowFitment;
