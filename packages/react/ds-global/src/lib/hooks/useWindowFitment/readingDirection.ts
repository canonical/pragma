import type {
  WindowFitmentDirection,
  WindowFitmentPlacement,
} from "./types.js";

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

/** Menu placements: attach to the trigger's leading edge, top-aligned. */
const LTR_MENU_PLACEMENT: WindowFitmentPlacement[] = [
  { direction: "right", align: "start" }, // desired: attach right, top-aligned
  { direction: "right", align: "end" }, //   no room below → bottom-aligned, still right
  { direction: "left", align: "start" }, //  no room right → flip side, top-aligned
  { direction: "left", align: "end" }, //    no room right AND below → both flipped
  { direction: "bottom", align: "center" }, // last-resort centred fallbacks
  { direction: "top", align: "center" },
];
const RTL_MENU_PLACEMENT: WindowFitmentPlacement[] = [
  { direction: "left", align: "start" },
  { direction: "left", align: "end" },
  { direction: "right", align: "start" },
  { direction: "right", align: "end" },
  { direction: "bottom", align: "center" },
  { direction: "top", align: "center" },
];

/**
 * Preferred placements for a contextual menu: attach to the trigger's leading
 * edge, top-aligned (`right-start` LTR / `left-start` RTL), flipping the
 * alignment axis (→ bottom-aligned) on vertical overflow and the side axis
 * (→ opposite side) on horizontal overflow. Distinct from
 * {@link getReadingDirectionPlacement}, which centres and is used by
 * arrow-bearing overlays (tooltip/popover).
 * @param direction The reading direction; defaults to `ltr`.
 */
export const getReadingDirectionMenuPlacement = (
  direction: "ltr" | "rtl" = "ltr",
): WindowFitmentPlacement[] =>
  direction === "rtl" ? RTL_MENU_PLACEMENT : LTR_MENU_PLACEMENT;
