import type { WindowFitmentPlacement, WindowFitmentSide } from "./types.js";

/**
 * ROOT contextual-menu placements: open BELOW the trigger, leading-aligned
 * (design review), flipping to above then to the side as space runs out.
 * Logical, so alignment mirrors automatically (leading = left in LTR, right in
 * RTL). Used by the top-level menu opened from a trigger.
 */
export const MENU_ROOT_PLACEMENT: WindowFitmentPlacement[] = [
  { side: "block-end", align: "start" }, //   below, leading-aligned (default)
  { side: "block-end", align: "end" }, //     horizontal overflow → trailing-aligned
  { side: "block-start", align: "start" }, //  vertical overflow → flip above
  { side: "block-start", align: "end" },
  { side: "inline-end", align: "start" }, //   no room above/below → to the side
  { side: "inline-start", align: "start" },
];

/**
 * SUBMENU (nested) placements: expand toward the trigger's reading-flow
 * (leading) edge, top-aligned, flipping alignment then side as space runs out —
 * standard cascade behaviour, a submenu opens beside its parent item, not below
 * it. Logical, so it mirrors automatically (right-start… in LTR, left-start… in
 * RTL).
 */
export const MENU_PLACEMENT: WindowFitmentPlacement[] = [
  { side: "inline-end", align: "start" }, // right-start LTR / left-start RTL
  { side: "inline-end", align: "end" }, //   vertical overflow → bottom-aligned
  { side: "inline-start", align: "start" }, // horizontal overflow → flip side
  { side: "inline-start", align: "end" },
  { side: "block-end", align: "center" }, //  last-resort bottom-centre
  { side: "block-start", align: "center" }, // top-centre
];

/**
 * Arrow-bearing overlay (tooltip/popover) placements: open toward the reading
 * direction first, centred. Resolves in LTR to [right, bottom, left, top].
 */
export const OVERLAY_PLACEMENT: WindowFitmentSide[] = [
  "inline-end",
  "block-end",
  "inline-start",
  "block-start",
];
