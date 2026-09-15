import { canonicalizeSlice, type Slice } from "../query/index.js";
import orderRows from "./orderRows.js";
import resolveEffectiveOrdering from "./resolveEffectiveOrdering.js";
import selectRows from "./selectRows.js";
import type { ExecuteSliceConfig } from "./types.js";

/**
 * Execute a query over complete local input: filter, then search, then
 * order. Windowing stays a separate projection (`applyWindow`), so the
 * caller still holds every matching row and can count it.
 *
 * The ordering applied is the effective one: the query's own terms, or the
 * source's declared default when it states none, then the source's
 * tiebreak. An empty `slice.sort` is therefore the documented default, never
 * "unordered". Nothing here groups: no source declares a groupable field,
 * and a grouped request is refused before it reaches this.
 */
export default function executeSlice<TRow extends object>(
  rows: readonly TRow[],
  slice: Slice,
  config: ExecuteSliceConfig,
): readonly TRow[] {
  return orderRows(selectRows(rows, slice, config, null), {
    ordering: resolveEffectiveOrdering(canonicalizeSlice(slice), config.sort),
    schema: config.schema,
    collation: config.sort.collation,
    empties: config.sort.empties,
  });
}
