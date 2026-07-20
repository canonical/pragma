/**
 * The SELF-UPDATING capabilities catalog.
 *
 * `buildCapabilitiesData(modules)` projects the LIVE grammar: it emits the
 * surface, walks `mcpSurface.tools` (the sorted, covenant-conformant set), and
 * annotates each tool from the authored `TOOL_HINTS` table. The tool set, the
 * category counts, and the discovery-sample list are all DERIVED — never pinned
 * — so the catalog tracks the surface automatically (the fix for the old shell's
 * hand-maintained list, which drifted to name retired tools).
 *
 * Pure + zod-free: it reads only `emitSurface` (itself fast-path-safe), so the
 * verb's storeless guarantee holds. The conventions + discovery strings are
 * exported so `kernel/project/mcp/instructions.ts` derives the handshake
 * orientation from the SAME source and the two can never diverge.
 */

import { VERSION } from "../../constants.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { TOOL_HINTS } from "./hints.js";
import type {
  CapabilitiesData,
  CatalogTool,
  DiscoveryStage,
  ToolCounts,
} from "./types.js";

/**
 * The three orientation conventions, verbatim from the old shell. They describe
 * the KG / tier-channel / SPARQL model and are still accurate for v2.
 */
export const CONVENTIONS = {
  system:
    "Pragma is a CLI and MCP server for querying a design system knowledge graph — blocks, tokens, modifiers, standards, and ontologies.",
  model:
    "Data is scoped by tier (hierarchical, e.g. global > apps > apps/lxd) and channel (normal, experimental, prerelease). Set these via config_tier and config_channel.",
  querying:
    "All queries run against an RDF triple store. Prefixed IRIs (e.g. ds:global.component.button) identify entities. Use ontology_list to discover namespaces.",
  mutations:
    "Mutating tools are plan-first: call once WITHOUT confirm to get a plan (meta.planOnly, no writes), then repeat the call with confirm: true to execute.",
} as const;

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

/**
 * Build the discovery sequence, deriving the sample list from the tools that
 * ACTUALLY exist (v2 ships block/standard/modifier/token samples). Wording is
 * ported from the old `buildCapabilitiesData`, plus a store-state pre-check so a
 * cold agent is never sent into `*_sample` (or any store read) blind — every
 * store read fails STORE_UNAVAILABLE until `sources_update` has built the store.
 */
export function buildDiscoverySequence(
  tools: readonly string[],
): DiscoveryStage[] {
  const samples = tools.filter((tool) => tool.endsWith("_sample"));
  const sampleList = samples.length > 0 ? samples.join(", ") : "the *_sample";
  return [
    {
      stage: 1,
      tool: "capabilities",
      purpose: "Understand conventions, available tools, and how to navigate",
    },
    {
      stage: 2,
      tool: "sources_status",
      purpose:
        "Confirm the store is built before any query. If it reports unavailable, call sources_update (confirm: true) first — otherwise the sample and domain reads below fail with STORE_UNAVAILABLE.",
    },
    {
      stage: 3,
      tool: "*_sample",
      purpose: `Call ${sampleList} tools to see real data shapes before querying. Prevents guessing at property names.`,
    },
    {
      stage: 4,
      tool: "domain tools",
      purpose:
        "Query specific entities — block_list, standard_lookup, etc. Use the use_when hints above to pick the right tool.",
    },
  ];
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
  const catalogTools: CatalogTool[] = tools.map((name) => {
    const hint = TOOL_HINTS[name];
    // A missing hint is a drift bug caught by `capabilities.test.ts`; degrade
    // to a truthful placeholder rather than throwing inside a tool call.
    return {
      name,
      category: hint?.category ?? "read",
      use_when:
        hint?.use_when ?? "(no hint authored — see capabilities/hints.ts)",
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
