import type { CSSProperties, RefObject } from "react";

export type FittedPopupPositioningStyles = Pick<
  CSSProperties,
  "top" | "right" | "bottom" | "left" | "visibility"
>;

export interface UseFittedPopupProps {
  /**
   * An array of preferred positions for the popup.
   * The hook will try to position the popup in these positions in order.
   * Defaults to ['top', 'bottom', 'left', 'right'].
   */
  preferredPositions?: Position[];
  /**
   * The distance between the target and the popup.
   * Can be a CSS length value (e.g., '10px', '1em').
   * Defaults to '0px'.
   */
  distance?: string;
  /**
   * The gutter (padding) around the viewport, preventing the popup from being too close to the edges.
   * Can be a CSS padding-like string (e.g., '10px', '10px 20px', '10px 20px 30px 40px').
   * Defaults to '0px'.
   */
  gutter?: string;
  /**
   * The default maximum width of the popup content.
   * Can be a CSS width value (e.g., '300px', '50%').
   * Defaults to '300px'.
   */
  defaultMaxWidth?: string;

  /**
   * The debounce options for the resize and scroll events.
   */
  debounceOpts?: {
    /** How long wait before processing actions called by resize events */
    resize?: number;
    /** How long to wait before processing actions called by scroll events */
    scroll?: number;
  };
}

export type Position = "top" | "bottom" | "left" | "right";

export interface UseFittedPopupResult {
  /**
   * A ref to be attached to the target element.
   */
  targetRef: RefObject<HTMLDivElement | null>;
  /**
   * A ref to be attached to the popup message element.
   */
  messageRef: RefObject<HTMLDivElement | null>;
  /**
   * The calculated position of the popup message.
   */
  position: { top: number; left: number };
  /**
   * The chosen position from the preferredPositions array.
   */
  chosenPosition: Position | null;
  /**
   * A boolean indicating whether the popup is visible.
   */
  isVisible: boolean;
  /**
   * A function to toggle the visibility of the popup.
   */
  toggleVisibility: () => void;
  /**
   * The style object to be applied to the popup message element.
   */
  messageStyle: FittedPopupPositioningStyles;

  id: string;
}
