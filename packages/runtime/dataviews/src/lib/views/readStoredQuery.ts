import { decodeQuery, isOwnedKey, type QueryIssue } from "../wire/index.js";
import type { SavedView, SavedViewsHost, StoredQuery } from "./types.js";

/**
 * A stored query as this collection reads it. A parameter naming no field
 * of the collection is refused rather than left out, since leaving it out
 * would widen the query.
 */
export default function readStoredQuery(
  view: SavedView,
  host: Pick<SavedViewsHost, "schema" | "capabilities">,
): StoredQuery {
  const params = new URLSearchParams(view.query);
  const { slice, issues } = decodeQuery({
    schema: host.schema,
    params,
    capabilities: host.capabilities,
  });
  const unknown = [...new Set(params.keys())]
    .filter((key) => !isOwnedKey(key, host.schema))
    .map(
      (key): QueryIssue => ({
        parameter: key,
        code: "unknown-field",
        reason: `"${key}" names no field of this collection`,
      }),
    );
  return { slice, issues: [...issues, ...unknown] };
}
