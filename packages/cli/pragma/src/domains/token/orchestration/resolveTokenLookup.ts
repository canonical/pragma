import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { TokenDetailed } from "../../shared/types.js";
import { lookupToken } from "../operations/index.js";

export default async function resolveTokenLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<TokenDetailed>> {
  const result: LookupResult<TokenDetailed> = await lookupMany(
    queries,
    (query) => lookupToken(store, query),
  );

  return {
    params: { names: queries },
    result,
  };
}
