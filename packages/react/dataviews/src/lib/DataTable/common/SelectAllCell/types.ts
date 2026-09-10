import type { ReadonlyChannel, Selection } from "@canonical/dataviews-core";

/**
 * Props of the select-all header cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the selection model and the displayed identities,
 * not forwarding a caller's native props.
 */
export type SelectAllCellProps = {
  readonly selection: Selection;
  /**
   * The displayed row identities — the scope this control acts on. Passed
   * as the channel, not its value: this is the only consumer of it, so a
   * table rendering no selection column must not re-render for it.
   */
  readonly ids: ReadonlyChannel<readonly string[]>;
};
