import type { PossiblyCollapsedSegment } from "../../types.js";

export interface ExpandedItemsProps {
  /**
   * ALL Breadcrumbs segments.
   * Collapsed segments (with `collapsed: true`) are not displayed in the UI, but used to keep `segmentWidths` in sync.
   */
  segments: PossiblyCollapsedSegment[];
  /** Bindable array of segment widths. */
  segmentWidths: number[];
  /** Bindable width of the expanded elements container. */
  containerWidth: number | undefined;
  /** Whether more segments can be collapsed. */
  canCollapseMore: boolean;
}
