import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { StandardDetailed } from "../../shared/types.js";
import { lookupStandard } from "../operations/index.js";

export default async function resolveStandardLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<StandardDetailed>> {
  const result: LookupResult<StandardDetailed> = await lookupMany(
    queries,
    (query) => lookupStandard(store, query),
  );

  return {
    params: { names: queries },
    result,
  };
}
