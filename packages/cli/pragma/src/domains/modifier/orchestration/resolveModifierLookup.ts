import type { LookupContract, LookupResult } from "../../shared/contracts.js";
import lookupMany from "../../shared/lookupMany.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { ModifierFamily } from "../../shared/types/index.js";
import { lookupModifier } from "../operations/index.js";

export default async function resolveModifierLookup(
  store: Pick<PragmaRuntime, "store">["store"],
  queries: readonly string[],
): Promise<LookupContract<ModifierFamily>> {
  const result: LookupResult<ModifierFamily> = await lookupMany(
    queries,
    (query) => lookupModifier(store, query),
  );

  return {
    params: { names: queries },
    result,
  };
}
