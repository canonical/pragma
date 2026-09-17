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
 * verb's storeless guarantee holds. The conventions + discovery strings live
 * here, on the distribution's side — they name its tools and tiers — and reach
 * the kernel's handshake instructions as data ({@link ORIENTATION}), so the two
 * can never diverge and the kernel names no tool.
 */

import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "../../constants.js";
import { renderCall } from "../../kernel/spec/call.js";
import { exampleCall, verbCategory } from "../../kernel/spec/guidance.js";
import type {
  CapabilityModule,
  DiscoveryStage,
  McpOrientation,
  VerbSpec,
} from "../../kernel/spec/index.js";
import { emitSurface, toolName } from "../../kernel/spec/index.js";
import type { CapabilitiesData, CatalogTool, ToolCounts } from "./types.js";

/**
 * The four orientation conventions — the single source both the `capabilities`
 * tool and the MCP handshake read, so the two cannot contradict each other.
 * `model` says what is true of each half separately: the TIER hierarchy scopes
 * a read of a tiered noun and names the argument that widens it; the CHANNEL is
 * data on the entity and scopes nothing.
 */
export const CONVENTIONS = {
  // `help` is authored as a bare phrase (`--help` renders it as one), so the
  // self-description trails in parentheses rather than after a period this
  // string would have to add — a fork writing "Explore the recipe graph."
  // otherwise reads "recipe graph.. A CLI and MCP server…".
  system: `${BIN_NAME} — ${PROGRAM_DESCRIPTION} (a CLI and MCP server over a knowledge graph).`,
  model:
    'The tier hierarchy (global > apps > apps_lxd) SCOPES every read of a tiered entity: lists answer from the top-level tiers, lookups prefer them. Pass tier: "<name>" for a tier plus its ancestors, or tier: "all" for every tier; each answer states its scope. Channels scope nothing.',
  querying:
    "All queries run against an RDF triple store. Prefixed IRIs (e.g. prefix:name) identify entities. Use ontology_list to discover the active namespaces.",
  mutations:
    "Mutating tools are plan-first: call once WITHOUT confirm to get a plan (meta.planOnly, no writes), then repeat the call with confirm: true to execute.",
} as const;

/**
 * The words people use are not the noun the tools carry: an agent looking for a
 * "component" tool finds none. Said exactly twice — here, in the handshake, and
 * in `block_list`'s own `useWhen` — and not a third time in the catalogue.
 */
export const BLOCKS_SENTENCE =
  "Components, patterns, layouts and subcomponents are all blocks: read every one of them through the block tools (block_list, block_lookup).";

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
        "See which pack is answering. A fresh install answers reads from the snapshot shipped with the CLI and needs no build; only an `unavailable` status requires sources_update (confirm: true), which is a project that declared its own packs and has not built them.",
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
        "Query specific entities — block_list, standard_lookup, etc. Each tool description opens with the question it answers.",
    },
  ];
}

/** What the handshake instructions are built from (see `kernel/project/mcp/instructions.ts`). */
export const ORIENTATION: McpOrientation = {
  conventions: [
    CONVENTIONS.system,
    CONVENTIONS.model,
    BLOCKS_SENTENCE,
    CONVENTIONS.querying,
    CONVENTIONS.mutations,
  ],
  discovery: buildDiscoverySequence,
  closing: (templates) =>
    `Call the \`capabilities\` tool for the full annotated tool catalog; read ${templates} resources (or \`graph_inspect\`) for entity detail.`,
};

/** The output modes v2 renders (dropped "text" → "plain"; condensed retired). */
const OUTPUT_MODES = ["plain", "json", "llm"] as const;

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
