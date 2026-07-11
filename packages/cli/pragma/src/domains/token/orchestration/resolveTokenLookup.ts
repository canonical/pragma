import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import { expandLookupQueries } from "../../shared/suggestions/index.js";
import type { TokenDetailed } from "../../shared/types/index.js";
import { lookupToken } from "../operations/index.js";

export default async function resolveTokenLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<TokenDetailed>> {
  const { names, globErrors } = await expandLookupQueries(
    queries,
    store,
    "token",
  );

  const lookupResult: LookupResult<TokenDetailed> =
    names.length > 0
      ? await lookupMany(names, (query) => lookupToken(store, query))
      : { results: [], errors: [], meta: { internalErrorCount: 0 } };

  const result: LookupResult<TokenDetailed> = {
    results: lookupResult.results,
    errors: [...lookupResult.errors, ...globErrors],
    meta: lookupResult.meta ?? { internalErrorCount: 0 },
  };

  return {
    params: { names: queries },
    result,
  };
}
