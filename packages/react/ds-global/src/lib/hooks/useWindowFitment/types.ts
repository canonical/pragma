import type { CSSProperties, RefObject } from "react";

export interface UseWindowFitmentProps {
  /**
   * Whether the popup should automatically fit into the viewport.
   * If true, the hook will try to fit the popup into the viewport if it doesn't fit in the preferred directions.
   * Defaults to false.
   */
  autoFit?: boolean;
  /**
   * Ordered preferred placements for the popup. Each entry is either a bare
   * direction (which implies `align: "center"`, the historical centred
   * behaviour) or a `{ direction, align }` pair. The hook tries them in order
   * and takes the first that naturally fits; alignment-flipping is expressed by
   * listing e.g. `{right, start}` then `{right, end}`.
   * Defaults to centred ['top', 'bottom', 'left', 'right'].
   */
  preferredDirections?: (WindowFitmentDirection | WindowFitmentPlacement)[];
  /**
   * The distance, in pixels between the target and the popup.
   * @TODO support non-px units. E.G., someone should be able to request '1em`.
   */
  distance?: string;
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
  onBestPositionChange?: (bestPosition?: BestPosition) => void;
}

export type WindowFitmentDirection = "top" | "bottom" | "left" | "right";

/**
 * Where the popup sits along the cross-axis of its side (Floating-UI's alignment
 * axis). For a vertical side (`left`/`right`) this is the vertical axis: `start`
 * top-aligns the popup with the target (`popup.top = target.top`), `end`
 * bottom-aligns it, `center` centres it. For a horizontal side (`top`/`bottom`)
 * it is the horizontal axis: `start` left-aligns, `end` right-aligns, `center`
 * centres. Defaults to `center` — the historical behaviour the tooltip relies on.
 */
export type WindowFitmentAlign = "start" | "center" | "end";

/** A fully-resolved placement: which side, and where along that side. */
export interface WindowFitmentPlacement {
  direction: WindowFitmentDirection;
  align: WindowFitmentAlign;
}

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
  /**
   * The offset, in pixels, needed to keep an arrow pointing at the target's
   * centre, along the cross-axis of the current placement (horizontal for
   * `top`/`bottom`, vertical for `left`/`right`). Zero when the popup is
   * centred on the target. Optional to consume: popups without an arrow ignore
   * it. `undefined` until a position has been measured.
   */
  arrowOffset?: ArrowOffset;
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

/**
 * The displacement of an arrow from the centre of a popup edge so it points at
 * the target. `axis` names which dimension the `offset` applies to: `x` shifts
 * the arrow horizontally (for `top`/`bottom` placements), `y` vertically (for
 * `left`/`right`).
 */
export interface ArrowOffset {
  axis: "x" | "y";
  offset: number;
}

export interface BestPosition {
  position: RelativePosition;
  /**
   * The SIDE the popup was placed on — always one of the four base directions.
   * Keys the arrow CSS, `computeArrowOffset`, and `fakeMargin`. Alignment never
   * appears here (see `align`), so those consumers stay corner-free.
   */
  positionName: WindowFitmentDirection;
  /** The alignment that produced this position. `center` for legacy callers. */
  align: WindowFitmentAlign;
  fits: boolean;
  autoFitOffset: RelativePosition;
}
