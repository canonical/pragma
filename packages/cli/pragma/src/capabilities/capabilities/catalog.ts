/**
 * The SELF-UPDATING capabilities catalog.
 *
 * `buildCapabilitiesData(modules)` projects the LIVE grammar: it emits the
 * surface, walks `mcpSurface.tools` (the sorted, covenant-conformant set), and
 * annotates each tool from the guidance its OWN verb declares (`useWhen`,
 * `example` — see `kernel/spec/guidance.ts`). The tool set, the
 * category counts, and the discovery-sample list are all DERIVED — never pinned
 * — so the catalog tracks the surface automatically (the fix for the old shell's
 * hand-maintained list, which drifted to name retired tools).
 *
 * Pure + zod-free: it reads only `emitSurface` (itself fast-path-safe), so the
 * verb's storeless guarantee holds. The conventions + discovery strings come
 * from the kernel's guidance generator, the SAME source the handshake
 * instructions read, so the two can never diverge.
 */

import { VERSION } from "../../constants.js";
import { renderCall } from "../../kernel/spec/call.js";
import {
  buildDiscoverySequence,
  CONVENTIONS,
  exampleCall,
  verbCategory,
} from "../../kernel/spec/guidance.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/index.js";
import { emitSurface, toolName } from "../../kernel/spec/index.js";
import type { CapabilitiesData, CatalogTool, ToolCounts } from "./types.js";

/** The output modes v2 renders (dropped "text" → "plain"; condensed retired). */
const OUTPUT_MODES = ["plain", "json", "llm"] as const;

/** The set of tool names that mutate, read from the emitted surface. */
function mutatingTools(modules: readonly CapabilityModule[]): Set<string> {
  const mutating = new Set<string>();
  for (const { verbs } of Object.values(emitSurface(modules).nouns)) {
    for (const verb of verbs) {
      if (verb.mutates && typeof verb.mcp === "string") mutating.add(verb.mcp);
    }
  }
  return mutating;
}

/** The live sorted tool names the covenant blesses, from the emitted surface. */
export function liveTools(modules: readonly CapabilityModule[]): string[] {
  return emitSurface(modules).mcpSurface.tools;
}

/** Tally the catalog tools by category (all counts DERIVED, never pinned). */
function countByCategory(tools: readonly CatalogTool[]): ToolCounts {
  const of = (category: CatalogTool["category"]) =>
    tools.filter((tool) => tool.category === category).length;
  return {
    total: tools.length,
    read: of("read"),
    write: of("write"),
    orientation: of("orientation"),
    diagnostic: of("diagnostic"),
  };
}

/**
 * Build the capabilities payload from a set of capability modules.
 *
 * @param modules - The live capability modules (passed in to avoid a static
 *   self-cycle; the verb's `run` dynamic-imports the registry barrel).
 * @returns The structured, self-consistent capabilities map.
 */
export function buildCapabilitiesData(
  modules: readonly CapabilityModule[],
): CapabilitiesData {
  const tools = liveTools(modules);
  const verbs = new Map(
    modules.flatMap((module) =>
      module.verbs.map((verb) => [toolName(verb.path), verb] as const),
    ),
  );
  const catalogTools: CatalogTool[] = tools.map((name) => {
    // Every emitted tool IS a verb of these modules, so the lookup cannot miss.
    const verb = verbs.get(name) as VerbSpec;
    const example = exampleCall(verb);
    // Missing guidance is a drift bug caught by `callRule.test.ts`; degrade to
    // the summary rather than throwing inside a tool call.
    return {
      name,
      category: verbCategory(verb),
      use_when: verb.useWhen ?? verb.summary,
      ...(example ? { example: renderCall(example, "mcp") } : {}),
    };
  });

  return {
    version: VERSION,
    conventions: CONVENTIONS,
    discovery_sequence: buildDiscoverySequence(tools),
    tools: catalogTools,
    counts: countByCategory(catalogTools),
    limits: { output_modes: OUTPUT_MODES, condensed_available: false },
  };
}

export { mutatingTools };
