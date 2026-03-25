import type { ListParams } from "../../shared/contracts.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { Disclosure, StandardListFilters } from "../../shared/types.js";
import { listStandards, lookupStandard } from "../operations/index.js";
import type { StandardListResolution } from "../types.js";
import buildStandardFilters from "./buildStandardFilters.js";
import standardEmptyError from "./standardEmptyError.js";

export default async function resolveStandardList(
  rt: Pick<PragmaRuntime, "store">,
  params: ListParams & StandardListFilters,
): Promise<StandardListResolution> {
  const filters = buildStandardFilters(params);
  const items = await listStandards(rt.store, filters);

  if (items.length === 0) {
    throw standardEmptyError(filters);
  }

  const disclosure: Disclosure = params.detailed
    ? { level: "detailed" }
    : params.digest
      ? { level: "digest" }
      : { level: "summary" };

  const details =
    disclosure.level === "summary"
      ? undefined
      : await Promise.all(
          items.map((item) =>
            lookupStandard(rt.store, item.name).catch(() => null),
          ),
        );

  return {
    params,
    items,
    filters,
    disclosure,
    details,
  };
}
