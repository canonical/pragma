import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  useResizeObserver,
} from "../useResizeObserver/index.js";
import { useWindowDimensions } from "../useWindowDimensions/index.js";
import type {
  BestPosition,
  RelativePosition,
  UseWindowFitmentProps,
  UseWindowFitmentResult,
  WindowFitmentDirection,
} from "./types.js";

const useWindowFitment = ({
  preferredDirections = ["top", "bottom", "left", "right"],
  distance = "0px",
  gutter = "0px",
  maxWidth = "350px",
  resizeDelay = 150,
  scrollDelay = 150,
  onBestPositionChange,
}: UseWindowFitmentProps): UseWindowFitmentResult => {
  // This hook is not intended to be used on the server.
  if (typeof window === "undefined") {
    return {
      targetRef: { current: null },
      popupRef: { current: null },
      bestPosition: undefined,
      popupPositionStyle: {},
    };
  }

  const targetRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const prevBestPosition = useRef<BestPosition | undefined>(undefined);

  const windowDimensions = useWindowDimensions({ resizeDelay, scrollDelay });
  const targetSize = useResizeObserver(targetRef?.current);
  const popupSize = useResizeObserver(popupRef?.current);

  /** The distance, in pixels, between the target and the popup. */
  const distanceAsPixelsNumber = useMemo(
    () => Number.parseInt(distance, 10) || 0,
    [distance],
  );

  /** The bounds of the window, accounting for the `gutter` prop. */
  const bounds = useMemo(() => {
    const gutterValues = gutter
      .split(" ")
      .map((val) => Number.parseInt(val, 10));
    const topGutter = gutterValues[0] || 0;
    const rightGutter = gutterValues[1] || gutterValues[0] || 0;
    const bottomGutter = gutterValues[2] || gutterValues[0] || 0;
    const leftGutter =
      gutterValues[3] || gutterValues[1] || gutterValues[0] || 0;

    return {
      top: topGutter,
      left: leftGutter,
      right: window.innerWidth - rightGutter,
      bottom: window.innerHeight - bottomGutter,
    };
  }, [gutter]);

  /**
   * Calculate the relative position of the popup when oriented in a given direction.
   * @param direction The side of the target element to position the popup on.
   * @param targetRect The bounding client rect of the target element.
   * @param popupRect The bounding client rect of the popup element.
   * @returns The calculated absolute position of the popup.
   */
  const calculateRelativePosition = useCallback(
    (
      direction: WindowFitmentDirection,
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
          left = targetRect.width + distanceAsPixelsNumber;
          break;
        case "left":
          left = -(popupRect.width + distanceAsPixelsNumber);
          break;
      }

      // vertical
      switch (direction) {
        case "top":
          top = -(popupRect.height + distanceAsPixelsNumber);
          break;
        case "bottom":
          top = targetRect.height + distanceAsPixelsNumber;
          break;
        case "right":
        case "left":
          top = (targetRect.height - popupRect.height) / 2;
          break;
      }

      return { left, top };
    },
    [distanceAsPixelsNumber],
  );

  /**
   * Check if the popup fits within the window. Accounts for `gutter` prop.
   * @param candidatePosition The absolute position of the popup
   * @param popupRect The bounding client rect of the popup element.
   * @returns Whether the popup fits within the window.
   */
  const fitsInWindow = useCallback(
    (candidatePosition: RelativePosition, popupRect: DOMRect): boolean => {
      // Absolute position of the popup's vertices, relative to the viewport
      const vertices = {
        top: candidatePosition.top,
        right: candidatePosition.left + popupRect.width,
        bottom: candidatePosition.top + popupRect.height,
        left: candidatePosition.left,
      };

      return (
        vertices.top >= bounds.top &&
        vertices.right <= bounds.right &&
        vertices.bottom <= bounds.bottom &&
        vertices.left >= bounds.left
      );
    },
    [bounds],
  );

  /**
   * Find the best position for the popup based on the preferred directions.
   * @param targetRect The bounding client rect of the target element.
   * @param popupRect The bounding client rect of the popup element.
   * @returns The best absolute position for the popup.
   */
  const findBestPosition = useCallback(
    (
      targetRect: DOMRect,
      popupRect: DOMRect,
      preferredDirections: WindowFitmentDirection[],
    ): BestPosition => {
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

        const absolutePosition = {
          top: targetRect.top + relativePosition.top,
          left: targetRect.left + relativePosition.left,
        };

        const bestPositionForName: BestPosition = {
          positionName: positionName,
          position: absolutePosition,
          fits: fitsInWindow(absolutePosition, popupRect),
        };

        // Save the calculated position as a fallback in case no other position fits.
        fallbackPosition ||= bestPositionForName;

        // If this position fits, use it.
        if (bestPositionForName.fits) {
          return bestPositionForName;
        }
      }

      // biome-ignore lint/style/noNonNullAssertion: Fallback position is always defined here, due to the loop above and the thrown error if preferredDirections is empty.
      return fallbackPosition!;
    },
    [calculateRelativePosition, fitsInWindow],
  );

  /** The best possible position for the popup. */
  const bestPosition: BestPosition | undefined = useMemo(() => {
    if (
      targetRef.current &&
      popupRef.current &&
      windowDimensions &&
      popupSize &&
      targetSize
    )
      return findBestPosition(
        targetRef.current.getBoundingClientRect(),
        popupRef.current.getBoundingClientRect(),
        preferredDirections,
      );
  }, [
    findBestPosition,
    preferredDirections,
    windowDimensions,
    popupSize,
    targetSize,
  ]);

  /** Notify the consumer when the best position changes. */
  useEffect(() => {
    if (bestPosition?.positionName !== prevBestPosition.current?.positionName) {
      prevBestPosition.current = bestPosition;
      if (onBestPositionChange) onBestPositionChange(bestPosition);
    }
  }, [bestPosition, onBestPositionChange]);

  const fakeMargin = useMemo(() => {
    let side = "Top";
    switch (bestPosition?.positionName) {
      case "top":
        side = "Bottom";
        break;
      case "bottom":
        side = "Top";
        break;
      case "left":
        side = "Right";
        break;
      case "right":
        side = "Left";
        break;
    }
    return {
      [`margin${side}`]: `${distanceAsPixelsNumber}px`,
    };
  }, [bestPosition, distanceAsPixelsNumber]);

  /** The style object to be applied to the popup element. */
  const popupPositionStyle: CSSProperties = useMemo(
    () => ({
      maxWidth: maxWidth,
      top: bestPosition?.position?.top || 0,
      left: bestPosition?.position?.left || 0,
      // Fake margin around the popup to prevent a mouseleave event when moving from the target to the popup.
      ...fakeMargin,
    }),
    [bestPosition, maxWidth, fakeMargin],
  );

  return {
    targetRef,
    popupRef,
    bestPosition,
    popupPositionStyle,
  };
};

export default useWindowFitment;
