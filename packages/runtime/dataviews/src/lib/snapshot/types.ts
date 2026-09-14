import type { ViewPresentation } from "../presentation/index.js";

/**
 * One serialisable value that puts a collection back as it was: its query as
 * canonical text, spelled as its reader spells it, and its arrangement — the
 * column widths, order and visibility in force. Plain JSON, so a server can
 * embed it in the page it renders and a store can keep it.
 *
 * Never the selection: a restored selection could name records the viewer
 * can no longer see, and an action's targets are captured when it runs,
 * never taken from a selection put back later.
 *
 * Which parts of the query the text carries is its reader's: a saved view
 * keeps the query and its renderer with no window and no annotation, while
 * what a server hands the client carries what the URL carries, the window
 * included.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsSnapshot = {
  /** The query as canonical text: `status=running&sort=cores__desc&page=2&size=50`. */
  readonly query: string;
  /** The arrangement in force: widths, order and visibility, keyed. */
  readonly presentation: ViewPresentation;
};
