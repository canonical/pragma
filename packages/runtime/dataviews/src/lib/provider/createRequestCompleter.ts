import type { Completion } from "../result/index.js";
import {
  createRowModel,
  type RowModel,
  type RowRecord,
} from "../rows/index.js";
import type { RequestCompleterConfig } from "./types.js";

/**
 * Create the provider's completion path: the one place a source's answer
 * becomes displayed rows.
 *
 * Only the pending request can publish: nothing is built for another, such
 * as a source's later delivery of a request already settled. The row model
 * is built before the coordinator publishes, so rows with an ambiguous
 * identity, or with a type the collection does not declare, fail the
 * request instead of replacing rows that can still be keyed and displayed;
 * those rows then report `refresh-failed`, or `stale` once the query has
 * moved on from the one they answer.
 *
 * @note Impure by design: a completion publishes the coordinator's state
 * and replaces the shared row model.
 */
export default function createRequestCompleter<TRow extends object = RowRecord>(
  config: RequestCompleterConfig<TRow>,
): (requestId: string, completion: Completion<TRow>) => boolean {
  const { coordinator, rows, identify, recordTyping, publish } = config;
  return (requestId, completion) => {
    if (coordinator.state.pendingRequestId !== requestId) {
      return false;
    }
    let model: RowModel<TRow> | null = null;
    let rejection: string | null = null;
    if (completion.status === "succeeded") {
      const built = createRowModel({
        rows: completion.page.rows,
        identify,
        previous: rows.get(),
      });
      // A model handed back whole was checked when it was accepted and
      // holds the same records still, so there is nothing to read again
      // and nothing about to leave the display.
      if (built.status === "built" && built.model !== rows.get()) {
        rejection = recordTyping?.rejectionOf(built.model) ?? null;
        model = rejection === null ? built.model : null;
      } else if (built.status === "rejected") {
        rejection = built.reason;
      }
    }
    const reported: Completion<TRow> =
      rejection === null
        ? completion
        : {
            status: "failed",
            failure: {
              reason: rejection,
              // Retrying the same request delivers the same rows.
              transient: false,
              // No library raised anything: the rows themselves are wrong.
              cause: null,
            },
          };
    const published = coordinator.complete(requestId, reported);
    if (published) {
      if (model !== null) {
        // The outgoing model is the last one these rows were displayed
        // in, so the memory is taken from it before it is let go.
        recordTyping?.remember(rows.get());
        rows.set(model);
      }
      publish();
    }
    return published;
  };
}
