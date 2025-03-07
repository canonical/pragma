import type { CSSProperties, RefObject } from "react";

export interface UseWindowFitmentProps {
  /**
   * An array of preferred directions for the popup.
   * The hook will try to position the popup in these directions in order.
   * Defaults to ['top', 'bottom', 'left', 'right'].
   */
  preferredDirections?: PopupDirection[];
  /**
   * The distance, in pixels between the target and the popup.
   * @TODO support non-px units and change this to a string. E.G., someone should be able to request '1em`.
   */
  distance?: number;
  /**
   * The gutter (padding) around the viewport, preventing the popup from being too close to the edges.
   * A CSS padding-like string (e.g., '10px', '10px 20px', '10px 20px 30px 40px').
   * Assumes that each value is in pixels.
   * @TODO support non-px units and change this to a string. E.G., someone should be able to request '0.5rem 1rem 1rem 0.5rem`.
   */
  gutter?: string;
  /**
   * The maximum width of the popup content.
   * Can be a CSS width value (e.g., '300px', '50%').
   * Defaults to '350px'.
   */
  maxWidth?: string;

  /** How long wait before processing actions called by resize events. Defaults to 150ms. */
  resizeDelay?: number;
  /** How long to wait before processing actions called by scroll events Defaults to 150ms. */
  scrollDelay?: number;

  /** Whether the popup is open or not. */
  isOpen?: boolean;

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
  popupPositionStyle: CSSProperties;
  //
  // /**
  //  * The distance, in pixels, between the target and the popup.
  //  * In the future, this may be different from the `distance` prop if the distance is converted to pixels from some other unit.
  //  */
  // distance: number;
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
