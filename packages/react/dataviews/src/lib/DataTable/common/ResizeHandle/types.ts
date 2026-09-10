import type { GridInteraction } from "@canonical/dataviews-core";

/**
 * Props of one column's resize control.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the interaction model and the column's resolved
 * width, not forwarding a caller's native props.
 */
export type ResizeHandleProps = {
  readonly interaction: GridInteraction;
  readonly columnId: string;
  /** The column's currently resolved width, captured when a resize begins. */
  readonly width: number;
  /** The id of the element naming this column. */
  readonly labelledBy: string;
};
