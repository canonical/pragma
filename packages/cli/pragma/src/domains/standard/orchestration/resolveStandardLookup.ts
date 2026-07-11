import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import { expandLookupQueries } from "../../shared/suggestions/index.js";
import type { StandardDetailed } from "../../shared/types/index.js";
import { lookupStandard } from "../operations/index.js";

export default async function resolveStandardLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<StandardDetailed>> {
  const { names, globErrors } = await expandLookupQueries(
    queries,
    store,
    "standard",
  );

  const lookupResult: LookupResult<StandardDetailed> =
    names.length > 0
      ? await lookupMany(names, (query) => lookupStandard(store, query))
      : { results: [], errors: [], meta: { internalErrorCount: 0 } };

  const result: LookupResult<StandardDetailed> = {
    results: lookupResult.results,
    errors: [...lookupResult.errors, ...globErrors],
    meta: lookupResult.meta ?? { internalErrorCount: 0 },
  };

  return {
    params: { names: queries },
    result,
  };
}
