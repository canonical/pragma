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
   * logical side (`inline-start` | `inline-end` | `block-start` | `block-end`,
   * implying `align: "center"`) or a `{ side, align }` pair. The hook resolves
   * each logical side to a physical direction from the anchored element's
   * writing direction — so `inline-*` mirrors automatically in RTL — then tries
   * them in order and takes the first that naturally fits. Alignment-flipping is
   * expressed by listing e.g. `{inline-end, start}` then `{inline-end, end}`.
   * Defaults to centred ['block-start', 'block-end', 'inline-start',
   * 'inline-end'] (= [top, bottom, left, right] in LTR).
   */
  preferredDirections?: (WindowFitmentSide | WindowFitmentPlacement)[];
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
   * Override the writing direction used to resolve logical (`inline-*`)
   * placements. Defaults to the document's `<html dir>` — the single source of
   * truth for the app locale. Set this only to force a subtree to a direction
   * that differs from the document.
   */
  direction?: "ltr" | "rtl";

  /**
   * An optional callback to be called when the best position of the popup changes.
   */
  onBestPositionChange?: (bestPosition?: BestPosition) => void;
}

/**
 * A PHYSICAL side — the resolved OUTPUT axis (keys the arrow CSS and fakeMargin).
 * Callers supply logical sides (see {@link WindowFitmentSide}); the hook resolves
 * them to a physical direction for the current writing direction.
 */
export type WindowFitmentDirection = "top" | "bottom" | "left" | "right";

/**
 * A LOGICAL side — the INPUT axis vocabulary. `inline-*` follows the anchored
 * element's writing direction, so it mirrors in RTL: `inline-start` is the start
 * of the line (LEFT in LTR / RIGHT in RTL) and `inline-end` is the trailing edge
 * (RIGHT in LTR / LEFT in RTL). `block-*` is the vertical axis and is
 * dir-invariant (`block-start` = top, `block-end` = bottom).
 */
export type WindowFitmentSide =
  | "inline-start"
  | "inline-end"
  | "block-start"
  | "block-end";

/**
 * Where the popup sits along the cross-axis of its side (Floating-UI's alignment
 * axis). For a vertical side this is the vertical axis: `start` top-aligns the
 * popup with the target (`popup.top = target.top`), `end` bottom-aligns it,
 * `center` centres it. For a horizontal side it is the horizontal axis. Defaults
 * to `center` — the historical behaviour the tooltip relies on.
 */
export type WindowFitmentAlign = "start" | "center" | "end";

/** A LOGICAL placement supplied to the hook: which logical side, and where along it. */
export interface WindowFitmentPlacement {
  side: WindowFitmentSide;
  align: WindowFitmentAlign;
}

/**
 * @typeParam TTarget - the element type of the anchored (target) element, so a
 *   caller attaching `targetRef` to a non-`div` (e.g. Popover's `<details>`)
 *   gets a correctly typed ref instead of casting. Defaults to `HTMLElement`.
 *   The refs are only read via `getBoundingClientRect()`, common to every
 *   element, so widening the type is sound.
 * @typeParam TPopup - the element type of the popup element. Defaults to
 *   `HTMLDivElement` (the popup surface is a `div` in every current consumer).
 */
export interface UseWindowFitmentResult<
  TTarget extends HTMLElement = HTMLElement,
  TPopup extends HTMLElement = HTMLDivElement,
> {
  /**
   * A ref to be attached to the target element.
   */
  targetRef: RefObject<TTarget | null>;
  /**
   * A ref to be attached to the popup element.
   */
  popupRef: RefObject<TPopup | null>;
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
  /**
   * The writing direction resolved from the anchored element (`ltr` on the
   * server / before mount). Set it as `dir` on a PORTALLED popup so its contents
   * (e.g. a submenu caret, text alignment) inherit the anchor's direction even
   * though the portal escapes the anchor's DOM subtree.
   */
  direction: "ltr" | "rtl";
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
