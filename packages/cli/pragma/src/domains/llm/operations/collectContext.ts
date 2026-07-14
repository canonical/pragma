import type { Store } from "@canonical/ke";
import { collectEntityCounts } from "../../info/operations/index.js";
import { listOntologies } from "../../ontology/operations/index.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { FilterConfig } from "../../shared/types/index.js";
import type { LlmContext } from "../types.js";

/**
 * Collects dynamic context for the `pragma llm` orientation output.
 *
 * Queries the store in parallel for entity counts (via
 * {@link collectEntityCounts}) and ontology namespaces, and combines them
 * with tier/channel config state.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param config - Filter config providing tier and channel settings.
 * @returns An {@link LlmContext} with entity counts and namespace list.
 */
export default async function collectContext(
  store: Store,
  config: FilterConfig,
): Promise<LlmContext> {
  const [counts, ontologies] = await Promise.all([
    collectEntityCounts(store, config),
    listOntologies(store),
  ]);

  return {
    tier: config.tier,
    tierChain: resolveTierChain(config.tier),
    channel: config.channel,
    counts,
    namespaces: ontologies.map((o) => o.prefix),
  };
}
