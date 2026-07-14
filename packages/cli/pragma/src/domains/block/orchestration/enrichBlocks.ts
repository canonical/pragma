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
  // Look up by each summary's stable unique URI, not its display name: names
  // recur across tiers/packages, so a by-name lookup returns every same-named
  // block and taking the first match collapses distinct blocks onto one.
  const nested = await Promise.all(
    summaries.map((summary) => lookupBlock(store, summary.uri, filters)),
  );
  // lookupBlock returns BlockDetailed[] — the URI resolves to exactly one match
  const details: BlockDetailed[] = nested.flatMap((matches) =>
    matches.at(0) ? [matches[0] as BlockDetailed] : [],
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
