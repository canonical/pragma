import type { PragmaRuntime } from "../../shared/runtime.js";
import type {
  BlockDetailed,
  BlockSummary,
  Disclosure,
  FilterConfig,
} from "../../shared/types/index.js";
import { lookupBlock } from "../operations/index.js";
import type { BlockListDigest } from "../types.js";

export default async function enrichBlocks(
  summaries: readonly BlockSummary[],
  store: Pick<PragmaRuntime, "store">["store"],
  filters: FilterConfig,
  disclosure: Disclosure,
): Promise<readonly (BlockListDigest | BlockDetailed)[]> {
  const details = await Promise.all(
    summaries.map((summary) => lookupBlock(store, summary.name, filters)),
  );

  if (disclosure.level === "detailed") {
    return details;
  }

  return details.map((detail) => ({
    uri: detail.uri,
    name: detail.name,
    type: detail.type,
    tier: detail.tier,
    summary: detail.summary,
    modifiers: detail.modifiers,
    implementations: detail.implementations,
    nodeCount: detail.nodeCount,
    tokenCount: detail.tokenCount,
    implementationPaths: detail.implementationPaths,
  }));
}
