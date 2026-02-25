import type { PossiblyHiddenSegment } from "../../types.js";

export interface ExpandedItemsProps {
  /**
   * ALL Breadcrumbs segments.
   * Collapsed segments (with `hidden: true`) are not displayed in the UI, but used to keep `segmentWidths` in sync.
   */
  segments: PossiblyHiddenSegment[];
  /** Bindable array of segment widths. */
  segmentWidths: number[];
  /** Bindable width of the expanded elements container. */
  containerWidth: number | undefined;
  /** Whether more segments can be collapsed. */
  canCollapseMore: boolean;
}
