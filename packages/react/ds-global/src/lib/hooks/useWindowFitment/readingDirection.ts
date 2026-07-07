import type { WindowFitmentDirection } from "./types.js";

/** Preferred placement order for a left-to-right reading direction. */
const LTR_PLACEMENT: WindowFitmentDirection[] = [
  "right",
  "bottom",
  "left",
  "top",
];
/** Preferred placement order for a right-to-left reading direction. */
const RTL_PLACEMENT: WindowFitmentDirection[] = [
  "left",
  "bottom",
  "right",
  "top",
];

/**
 * Resolve the preferred placement order for an overlay from a reading direction.
 * Overlays open toward the reading direction first (right on LTR, left on RTL),
 * then fall back downward, so they follow the natural flow of the content.
 * @param direction The reading direction; defaults to `ltr`.
 * @returns The ordered list of preferred placements.
 */
export const getReadingDirectionPlacement = (
  direction: "ltr" | "rtl" = "ltr",
): WindowFitmentDirection[] =>
  direction === "rtl" ? RTL_PLACEMENT : LTR_PLACEMENT;

/**
 * Read the document's current reading direction on the client.
 * @note Impure — reads the DOM.
 * @returns `rtl` when the document direction is right-to-left, otherwise `ltr`.
 */
export const readDocumentDirection = (): "ltr" | "rtl" => {
  if (typeof document === "undefined") return "ltr";
  return document.dir === "rtl" ? "rtl" : "ltr";
};
