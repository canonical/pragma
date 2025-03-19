import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useResizeObserver } from "../useResizeObserver/index.js";
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
  const isServer = typeof window === "undefined";
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
    if (isServer) return;
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
      right: windowDimensions.windowWidth - rightGutter,
      bottom: windowDimensions.windowHeight - bottomGutter,
    };
  }, [gutter, windowDimensions, isServer]);

  /**
   * Calculate the relative position of the popup when oriented in a given direction.
   * @param direction The side of the target element to position the popup on.
   * @param targetRect The bounding client rect of the target element.
   * @param popupRect The bounding client rect of the popup element.
   * @returns The calculated relative position of the popup.
   */
  const calculateRelativePosition = useCallback(
    (
      direction: WindowFitmentDirection,
      targetRect: DOMRect,
      popupRect: DOMRect,
    ): RelativePosition => {
      let left = 0;
      let top = 0;
      if (isServer) {
        return {
          left,
          top,
        };
      }

      /*
        We use left and top offsets to position the popup relative to the target element.
        Then, we apply a margin on the opposite side of the popup to create a buffer zone between the target and the popup, to prevent a mouseleave event when moving from the target to the popup.
        The fake margin is already included in `targetRect` dimensions, as it is rendered hidden at least once before the popup is shown.
        In cases where `targetRect` is not included in the calculation, we add `distanceAsPixelsNumber` to account for the fake margin.
       */
      // horizontal offset
      switch (direction) {
        case "top":
        case "bottom":
          left = (targetRect.width - popupRect.width) / 2;
          break;
        case "right":
          left = targetRect.width;
          break;
        case "left":
          left = -(popupRect.width + distanceAsPixelsNumber);
          break;
      }

      // vertical offset
      switch (direction) {
        case "top":
          top = -(popupRect.height + distanceAsPixelsNumber);
          break;
        case "bottom":
          top = targetRect.height;
          break;
        case "right":
        case "left":
          top = (targetRect.height - popupRect.height) / 2;
          break;
      }

      return { left, top };
    },
    [distanceAsPixelsNumber, isServer],
  );

  /**
   * Check if the popup fits within the window. Accounts for `gutter` prop.
   * @param candidatePosition The absolute position of the popup
   * @param popupRect The bounding client rect of the popup element.
   * @returns Whether the popup fits within the window.
   */
  const fitsInWindow = useCallback(
    (candidatePosition: RelativePosition, popupRect: DOMRect): boolean => {
      if (isServer || !bounds) return false;

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
    [bounds, isServer],
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
    ): BestPosition | undefined => {
      if (isServer) return;
      let fallbackPosition: BestPosition | undefined = undefined;

      if (!preferredDirections.length) {
        throw new Error("Preferred directions must not be empty.");
      }

      for (const direction of preferredDirections) {
        const relativePosition = calculateRelativePosition(
          direction,
          targetRect,
          popupRect,
        );

        const absolutePosition = {
          top: targetRect.top + relativePosition.top,
          left: targetRect.left + relativePosition.left,
        };

        const bestPositionForName: BestPosition = {
          positionName: direction,
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
    [calculateRelativePosition, fitsInWindow, isServer],
  );

  /** The best possible position for the popup. */
  const bestPosition: BestPosition | undefined = useMemo(() => {
    if (
      !isServer &&
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
    isServer,
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
