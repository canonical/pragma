/** The grid presets from \@canonical/styles (`.grid.responsive` / `.grid.intrinsic`). */
export const GRID_PRESETS = ["responsive", "intrinsic"] as const;

/**
 * A grid preset laying out content items:
 *
 * - `responsive` — fixed-responsive, breakpoint-driven columns (4 below
 *   768px, 8 to 1279px, 12 from 1280px).
 * - `intrinsic` — fluid auto-fill in groups of four
 *   `minmax(--grid-col-min, 1fr)` columns; column count follows available
 *   width, not breakpoints.
 */
export type GridPreset = (typeof GRID_PRESETS)[number];
