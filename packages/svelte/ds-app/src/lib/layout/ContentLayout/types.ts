// Ported from @canonical/react-ds-app ContentLayout

import type { GridPreset } from "@canonical/ds-types";
import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

/**
 * The grid preset laying out the content items — `GridPreset` from
 * \@canonical/ds-types, rendered by the `.grid` presets in
 * \@canonical/styles: `responsive` (fixed-responsive, breakpoint-driven
 * 4/8/12 columns) or `intrinsic` (fluid auto-fill groups of four
 * `minmax(--grid-col-min, 1fr)` columns).
 */
export type ContentLayoutGrid = GridPreset;

type BaseProps = SvelteHTMLElements["div"];

export interface ContentLayoutProps extends BaseProps {
  /** Content items (default slot) — direct grid items. */
  children?: Snippet;
  /** Grid preset. Defaults to `responsive` (fixed-responsive). */
  grid?: ContentLayoutGrid;
}
