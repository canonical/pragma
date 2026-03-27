import type { ListParams } from "../../shared/contracts.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { Disclosure } from "../../shared/types/index.js";
import { listBlocks } from "../operations/index.js";
import type { BlockListContract } from "../types.js";
import blockEmptyError from "./blockEmptyError.js";
import buildBlockFilters from "./buildBlockFilters.js";
import enrichBlocks from "./enrichBlocks.js";

export default async function resolveBlockList(
  rt: Pick<PragmaRuntime, "store" | "config">,
  params: ListParams,
): Promise<BlockListContract> {
  const filters = buildBlockFilters(rt, params.allTiers);
  const disclosure: Disclosure = params.detailed
    ? { level: "detailed" }
    : params.digest
      ? { level: "digest" }
      : { level: "summary" };
  const summaries = await listBlocks(rt.store, filters);

  if (summaries.length === 0) {
    throw blockEmptyError(filters, params.allTiers);
  }

  const items =
    disclosure.level === "summary"
      ? summaries
      : await enrichBlocks(summaries, rt.store, filters, disclosure);

  return {
    params,
    result: {
      items,
      filters,
      disclosure,
    },
  };
}
