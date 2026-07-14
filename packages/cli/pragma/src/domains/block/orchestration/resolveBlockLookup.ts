import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import { expandLookupQueries } from "../../shared/suggestions/index.js";
import type { BlockDetailed, FilterConfig } from "../../shared/types/index.js";
import { lookupBlock } from "../operations/index.js";

export default async function resolveBlockLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
  filters: FilterConfig,
): Promise<LookupContract<BlockDetailed>> {
  const { names, globErrors } = await expandLookupQueries(
    queries,
    store,
    "block",
  );

  const nested: LookupResult<BlockDetailed[]> =
    names.length > 0
      ? await lookupMany(names, (query) => lookupBlock(store, query, filters))
      : { results: [], errors: [], meta: { internalErrorCount: 0 } };

  // lookupBlock returns BlockDetailed[] (multiple matches per name) — flatten
  const result: LookupResult<BlockDetailed> = {
    results: nested.results.flat(),
    errors: [...nested.errors, ...globErrors],
    meta: nested.meta ?? { internalErrorCount: 0 },
  };

  return {
    params: { names: queries },
    result,
  };
}
