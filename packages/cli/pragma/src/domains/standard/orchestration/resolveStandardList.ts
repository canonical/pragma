import type { ListParams } from "../../shared/contracts.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type {
  Disclosure,
  StandardListFilters,
} from "../../shared/types/index.js";
import {
  listCategories,
  listStandards,
  lookupStandard,
} from "../operations/index.js";
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
    const hasFilters = Boolean(filters.category || filters.search);
    const allItems = hasFilters ? await listStandards(rt.store) : [];
    const categories = filters.category
      ? await listCategories(rt.store)
      : undefined;
    throw standardEmptyError(filters, {
      unfilteredCount: allItems.length,
      availableCategories: categories?.map((c) => c.name),
    });
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
