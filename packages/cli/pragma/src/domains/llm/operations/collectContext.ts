import type { Store } from "@canonical/ke";
import { listBlocks } from "../../block/operations/index.js";
import { listModifiers } from "../../modifier/operations/index.js";
import { listOntologies } from "../../ontology/operations/index.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { FilterConfig } from "../../shared/types.js";
import { listStandards } from "../../standard/operations/index.js";
import { listTokens } from "../../token/operations/index.js";
import type { LlmContext } from "../types.js";

/**
 * Collects dynamic context for the `pragma llm` orientation output.
 *
 * Queries the store in parallel for block, standard, modifier, token, and
 * ontology counts, and combines them with tier/channel config state.
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
  const [blocks, standards, modifiers, tokens, ontologies] = await Promise.all([
    listBlocks(store, config),
    listStandards(store),
    listModifiers(store),
    listTokens(store),
    listOntologies(store),
  ]);

  return {
    tier: config.tier,
    tierChain: resolveTierChain(config.tier),
    channel: config.channel,
    counts: {
      blocks: blocks.length,
      standards: standards.length,
      modifierFamilies: modifiers.length,
      tokens: tokens.length,
    },
    namespaces: ontologies.map((o) => o.prefix),
  };
}
