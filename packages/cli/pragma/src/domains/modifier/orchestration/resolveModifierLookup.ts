import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import { expandLookupQueries } from "../../shared/suggestions/index.js";
import type { ModifierFamily } from "../../shared/types/index.js";
import { lookupModifier } from "../operations/index.js";

export default async function resolveModifierLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<ModifierFamily>> {
  const { names, globErrors } = await expandLookupQueries(
    queries,
    store,
    "modifier",
  );

  const lookupResult: LookupResult<ModifierFamily> =
    names.length > 0
      ? await lookupMany(names, (query) => lookupModifier(store, query))
      : { results: [], errors: [] };

  const result: LookupResult<ModifierFamily> = {
    results: lookupResult.results,
    errors: [...lookupResult.errors, ...globErrors],
  };

  return {
    params: { names: queries },
    result,
  };
}
