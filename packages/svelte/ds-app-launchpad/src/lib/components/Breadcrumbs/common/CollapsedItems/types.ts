import type { PossiblyCollapsedSegment } from "../../types.js";

export interface CollapsedItemsProps {
  /** Collapsed Breadcrumbs segments. */
  segments: PossiblyCollapsedSegment[];
  /** Whether the segment for current page is contained in the collapsed elements. */
  hasCurrent: boolean;
}
