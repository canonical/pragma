/**
 * Collect dynamic context for `pragma llm` orientation output.
 *
 * Queries the store for entity counts and config state.
 * All queries run in parallel via Promise.all.
 */

import type { Store } from "@canonical/ke";
import { listComponents } from "../component/operations/index.js";
import { resolveTierChain } from "../filters/buildTierFilter.js";
import { listModifiers } from "../modifier/operations/index.js";
import { listOntologies } from "../ontology/operations/index.js";
import type { FilterConfig } from "../shared/types.js";
import { listStandards } from "../standard/operations/index.js";
import { listTokens } from "../token/operations/index.js";
import type { LlmContext } from "./types.js";

export default async function collectLlmContext(
  store: Store,
  config: FilterConfig,
): Promise<LlmContext> {
  const [components, standards, modifiers, tokens, ontologies] =
    await Promise.all([
      listComponents(store, config),
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
      components: components.length,
      standards: standards.length,
      modifierFamilies: modifiers.length,
      tokens: tokens.length,
    },
    namespaces: ontologies.map((o) => o.prefix),
  };
}
