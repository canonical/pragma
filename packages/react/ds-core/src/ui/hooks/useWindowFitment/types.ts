import type { CSSProperties, RefObject } from "react";

/**
 * The style object to be applied to the popup element.
 */
export type WindowFitmentStyles = Pick<
  CSSProperties,
  "top" | "right" | "bottom" | "left" | "maxWidth"
>;

export interface UseWindowFitmentProps {
  /**
   * An array of preferred directions for the popup.
   * The hook will try to position the popup in these directions in order.
   * Defaults to ['top', 'bottom', 'left', 'right'].
   */
  preferredDirections?: PopupDirection[];
  /**
   * The distance between the target and the popup.
   * Can be a CSS length value (e.g., '10px', '1em').
   * Defaults to '10px'.
   */
  distance?: string;
  /**
   * The gutter (padding) around the viewport, preventing the popup from being too close to the edges.
   * Can be a CSS padding-like string (e.g., '10px', '10px 20px', '10px 20px 30px 40px').
   * Defaults to '0px'.
   */
  gutter?: string;
  /**
   * The maximum width of the popup content.
   * Can be a CSS width value (e.g., '300px', '50%').
   * Defaults to '300px'.
   */
  maxWidth?: string;

  /** How long wait before processing actions called by resize events. Defaults to 150ms. */
  resizeDelay?: number;
  /** How long to wait before processing actions called by scroll events Defaults to 150ms. */
  scrollDelay?: number;

  /** Whether the popup is visible or not. */
  isVisible?: boolean;

  /**
   * An optional callback to be called when the best position of the popup changes.
   */
  onBestPositionChange?: (bestPosition: BestPosition) => void;
}

export type PopupDirection = "top" | "bottom" | "left" | "right";

export interface UseWindowFitmentResult {
  /**
   * A ref to be attached to the target element.
   */
  targetRef: RefObject<HTMLDivElement | null>;
  /**
   * A ref to be attached to the popup element.
   */
  popupRef: RefObject<HTMLDivElement | null>;
  /**
   * The calculated best possible position of the popup element.
   */
  bestPosition?: BestPosition;
  /**
   * The style object to be applied to the popup element.
   */
  popupPositionStyle: WindowFitmentStyles;
}

export type RelativePosition = {
  top: number;
  left: number;
};

export interface BestPosition {
  position: RelativePosition;
  positionName: PopupDirection;
  fits: boolean;
}
