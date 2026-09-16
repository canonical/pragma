import type { ReadonlyChannel, Selection } from "@canonical/dataviews-core";

/**
 * Props of the checkbox selecting every card on the page.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the selection model and the displayed identities,
 * not forwarding a caller's native props.
 */
export type SelectAllOnPageProps = {
  readonly selection: Selection;
  /**
   * The displayed identities — the scope this control acts on. Passed as the
   * channel, not its value: this control is mounted only where cards are
   * selectable, and the cards themselves must not re-render for a selection.
   */
  readonly ids: ReadonlyChannel<readonly string[]>;
};
