import type { WindowFitmentPlacement, WindowFitmentSide } from "./types.js";

/**
 * Contextual-menu placements: open toward the trigger's reading-flow (leading)
 * edge, top-aligned, flipping alignment then side as space runs out. Logical, so
 * it mirrors automatically — resolves to the historical right-start/… order in
 * LTR and left-start/… in RTL.
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
