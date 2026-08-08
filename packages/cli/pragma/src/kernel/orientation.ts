/**
 * Agent orientation: the four conventions and the discovery sequence, in ONE
 * place, read by both surfaces that carry them.
 *
 * The `capabilities` tool payload (`capabilities/capabilities/catalog.ts`) and
 * the MCP initialize handshake (`kernel/project/mcp/instructions.ts`) tell an
 * arriving agent the same four things and walk it through the same four stages.
 * A second writing of either would be a second thing to keep true, and the
 * handshake is sent once per session with no chance to correct itself.
 *
 * IN `kernel/` BECAUSE `instructions.ts` IS. It used to live in `catalog.ts`,
 * so a kernel module reached three levels up into a concrete capability — one
 * of the tree's only two kernel→capabilities back-edges, and an arrow that must
 * point the other way before the command model can be extracted with `kernel/`
 * depending on `capabilities/` solely through `CapabilityModule`. `catalog.ts`
 * imports DOWN to here now, as every other capability does.
 *
 * Nothing user-visible moves: `capabilities --format json` still carries
 * `conventions` and `discovery_sequence` byte-for-byte, and the handshake still
 * composes from the same four fields.
 *
 * KERNEL COPY RULE (`kernel/copy.test.ts`): every string here is either
 * composed from the distribution's declared identity (`system`) or generic
 * machinery talk about tools and stores. The tool names that DO appear are
 * either derived from the live surface (the `*_sample` list) or kernel-owned
 * verbs — except stage 4's, which are two authored domain nouns this guard's
 * rule does not reach. See the stage-4 note on {@link buildDiscoverySequence}
 * for what they are, why the guard is silent, and why the owner has not ruled.
 */

import { BIN_NAME, PROGRAM_DESCRIPTION } from "../constants.js";
import type { DiscoveryStage } from "./spec/types.js";

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

/**
 * Build the discovery sequence, deriving the sample list from the tools that
 * ACTUALLY exist (block/standard/modifier/token declare samples today), plus a
 * store-state pre-check so a cold agent is never sent into `*_sample` (or any
 * store read) blind — every store read fails STORE_UNAVAILABLE until
 * `sources_update` has built the store.
 *
 * THE STAGE-4 NOTE, which the module docblock points here for. Stages 1 and 2
 * name kernel-owned tools (`capabilities`, `sources_status`) and stage 3 is
 * DERIVED from the live surface, so all three stay true in a fork. Stage 4 is
 * the exception: its purpose string hardcodes `block_list` and
 * `standard_lookup`, which are two of THIS distribution's domain nouns, written
 * by hand. They came here verbatim with the `catalog.ts` fold that moved
 * `CONVENTIONS` and this function into `kernel/` to kill the
 * kernel→capabilities back-edge — the strings were not edited, but they crossed
 * into the tree whose whole premise is that it names no domain, and they ship
 * in the MCP handshake every session, so a fork inherits them.
 *
 * `kernel/copy.test.ts` does not fire on them, and that is its rule working as
 * written rather than a hole: it matches the distribution's `name` as a word,
 * the phrase "design system", and declared namespace IRIs. A tool name built
 * from a domain noun is none of the three. Recording it here so the guard's
 * silence is a known gap and not a reader's false comfort.
 *
 * NOT FIXED HERE BECAUSE IT IS NOT THIS LANE'S CALL. The owner has these
 * literals on the open-decisions list, and the two repairs — derive stage 4
 * from the surface the way stage 3 already is, or leave stage 4 behind in
 * `catalog.ts` and have `instructions.ts` read stages 1-3 from here — differ in
 * what an agent is told, not just in where a string lives. Whichever is chosen,
 * this note is the place that says the literals were known about.
 *
 * @param tools - The live sorted tool names from the emitted surface.
 * @returns The four discovery stages, with stage 3 derived from `tools`.
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
