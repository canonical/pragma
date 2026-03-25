import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { BlockDetailed, FilterConfig } from "../../shared/types.js";
import { lookupBlock } from "../operations/index.js";

export default async function resolveBlockLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
  filters: FilterConfig,
): Promise<LookupContract<BlockDetailed>> {
  const result: LookupResult<BlockDetailed> = await lookupMany(
    queries,
    (query) => lookupBlock(store, query, filters),
  );

  return {
    params: { names: queries },
    result,
  };
}
