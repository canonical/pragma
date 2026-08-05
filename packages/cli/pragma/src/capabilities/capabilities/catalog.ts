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

import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "../../constants.js";
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
 * The four orientation conventions, and the single source both the
 * `capabilities` tool and the MCP handshake read, so the two cannot contradict
 * each other. `system` projects the distribution's identity rather than naming
 * a domain — the live tool catalog the same handshake carries already says
 * which nouns exist. Every connecting agent is told these four things before it
 * calls anything, so each must be TRUE of the tools it is about to reach:
 * `model` told agents to scope data by tier and channel via `config_set` until
 * `block list` — the last verb that filtered on either — became a declared
 * story with no term for them, at which point it became a falsehood shipped in
 * the handshake.
 */
export const CONVENTIONS = {
  // `help` is authored as a bare phrase (`--help` renders it as one), so the
  // self-description trails in parentheses rather than after a period this
  // string would have to add — a fork writing "Explore the recipe graph."
  // otherwise reads "recipe graph.. A CLI and MCP server…".
  system: `${BIN_NAME} — ${PROGRAM_DESCRIPTION} (a CLI and MCP server over a knowledge graph).`,
  // Length is load-bearing: this string ships in the MCP handshake, which
  // carries a hard character ceiling (`INSTRUCTIONS_MAX_CHARS`) because it
  // costs every session's context. Say the true thing in about the space the
  // false one took, rather than raising the ceiling to fit better prose.
  model:
    "Reads are UNSCOPED: every list and lookup answers from the whole graph. The tier and channel config fields are recorded but narrow nothing today; filter the rows you get back, or use graph_query for a scoped SELECT.",
  querying:
    "All queries run against an RDF triple store. Prefixed IRIs (e.g. prefix:name) identify entities. Use ontology_list to discover the active namespaces.",
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
        "See which pack is answering. A fresh install answers reads from the snapshot embedded in the binary and needs no build; only an `unavailable` status requires sources_update (confirm: true), which is a project that declared its own packs and has not built them.",
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
