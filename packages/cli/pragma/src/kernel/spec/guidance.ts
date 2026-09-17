/**
 * The ONE generator of tool guidance.
 *
 * A verb declares the question it answers (`useWhen`) and one real call
 * (`example`) once. Everything a caller reads when choosing a tool is built
 * here from those two and the summary: the MCP tool description, the
 * `capabilities` catalogue entry, the verb's help, and — through the
 * conventions and discovery sequence below — the server instructions. A
 * sentence that lives in one place cannot be true in the catalogue and missing
 * from the description, which is how an agent that never called
 * `capabilities` came to choose between fifty tools without it.
 *
 * Zod-free: the catalogue and help read it on the fast path.
 */

import { BIN_NAME, PROGRAM_DESCRIPTION } from "../../constants.js";
import type { Call } from "./call.js";
import { renderCall } from "./call.js";
import type { VerbSpec } from "./types.js";

/** A tool's behavioural category, used for grouping + counts. */
export type ToolCategory = "read" | "write" | "orientation" | "diagnostic";

/** A single stage in the discovery flow an agent follows at session start. */
export interface DiscoveryStage {
  readonly stage: number;
  readonly tool: string;
  readonly purpose: string;
}

/** A verb's category: `write` ⟺ it mutates, else what it declares, else `read`. */
export function verbCategory(verb: VerbSpec): ToolCategory {
  return verb.capability.mutates ? "write" : (verb.category ?? "read");
}

/** A verb's declared example as a call, or nothing when it declares none. */
export function exampleCall(verb: VerbSpec): Call | undefined {
  return verb.example
    ? { verb: verb.path.join(" "), params: verb.example }
    : undefined;
}

/**
 * The agent-facing MCP tool description: the question first — it is what a
 * caller scanning fifty descriptions matches its task against — then what the
 * tool returns (the richer `doc` when authored), then one call to copy.
 *
 * @param verb - The verb to describe.
 * @returns The description; a verb declaring no guidance keeps `doc ?? summary`.
 */
export function describeTool(verb: VerbSpec): string {
  const example = exampleCall(verb);
  return [
    verb.useWhen,
    verb.doc ?? verb.summary,
    example && `Example: ${renderCall(example, "mcp")}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The five orientation conventions, and the single source both the
 * `capabilities` tool and the MCP handshake read, so the two cannot contradict
 * each other. `system` projects the distribution's identity rather than naming
 * a domain — the live tool catalog the same handshake carries already says
 * which nouns exist. `querying` is verbatim from the old shell (the SPARQL
 * model is still accurate for v2); `mutations` is new in v2, surfacing the
 * plan-first/confirm gate.
 *
 * `model` is the one that has had to be rewritten twice, and both times because
 * it was describing a gate that had moved. It stopped claiming reads were
 * tier/channel-scoped when the hand-written filtering was removed (the
 * hierarchy became graph data, not a query gate) — and "Reads are unscoped —
 * every list shows everything" became false the day the tier scope landed. An
 * agent reading it took a scoped `block_list` for the whole design system,
 * which is the exact misreading the sentence existed to prevent. So it now says
 * what is true of each half separately: the TIER hierarchy gates a read of a
 * tiered noun and names the argument that widens it, while the CHANNEL is still
 * data on the entity and gates nothing.
 */
export const CONVENTIONS = {
  // `help` is authored as a bare phrase (`--help` renders it as one), so the
  // self-description trails in parentheses rather than after a period this
  // string would have to add — a fork writing "Explore the recipe graph."
  // otherwise reads "recipe graph.. A CLI and MCP server…".
  system: `${BIN_NAME} — ${PROGRAM_DESCRIPTION} (a CLI and MCP server over a knowledge graph).`,
  model:
    'The tier hierarchy (global > apps > apps_lxd) SCOPES every read of a tiered entity: lists answer from the top-level tiers, lookups prefer them. Pass tier: "<name>" for a tier plus its ancestors, or tier: "all" for every tier; each answer states its scope. Channels scope nothing.',
  // The words people use are not the noun the tools carry, and an agent that
  // goes looking for a "component" tool finds none. One sentence, no alias.
  blocks:
    "Components, patterns, layouts and subcomponents are all blocks: read every one of them through the block tools (block_list, block_lookup).",
  querying:
    "All queries run against an RDF triple store. Prefixed IRIs (e.g. prefix:name) identify entities. Use ontology_list to discover the active namespaces.",
  mutations:
    "Mutating tools are plan-first: call once WITHOUT confirm to get a plan (meta.planOnly, no writes), then repeat the call with confirm: true to execute.",
} as const;

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
