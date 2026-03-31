import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { BlockDetailed, FilterConfig } from "../../shared/types/index.js";
import { lookupBlock } from "../operations/index.js";

export default async function resolveBlockLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
  filters: FilterConfig,
): Promise<LookupContract<BlockDetailed>> {
  const nested: LookupResult<BlockDetailed[]> = await lookupMany(
    queries,
    (query) => lookupBlock(store, query, filters),
  );

  // lookupBlock returns BlockDetailed[] (multiple matches per name) — flatten
  const result: LookupResult<BlockDetailed> = {
    results: nested.results.flat(),
    errors: nested.errors,
  };

  return {
    params: { names: queries },
    result,
  };
}
