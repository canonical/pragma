import type { ViewPresentation } from "../presentation/index.js";
import type { DataViewsSnapshot } from "./types.js";

/** Configuration of one snapshot. */
type SnapshotConfig = {
  /**
   * The query as its reader spells it: a saved view's through the encoder
   * with no window and its renderer, a server handoff's as the location
   * carries it, the open view included.
   */
  readonly query: URLSearchParams;
  /** The arrangement to keep with the query. */
  readonly presentation: ViewPresentation;
};

/**
 * Create one snapshot: the query as the text its reader spelled, beside a
 * deep copy of the arrangement, frozen at its top, so nothing in it is shared
 * with the arrangement in force. The one writer of the value every reader's
 * snapshot is — a saved view's and a server render's alike — so the two
 * never differ in shape, while each spells its query the one way its class
 * of parameters is spelled.
 */
export default function createSnapshot(
  config: SnapshotConfig,
): DataViewsSnapshot {
  return Object.freeze({
    query: config.query.toString(),
    presentation: Object.freeze(structuredClone(config.presentation)),
  });
}
