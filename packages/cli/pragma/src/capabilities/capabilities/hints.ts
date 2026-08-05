/**
 * The one authored input to the `capabilities` catalog: a `use_when` behavioural
 * hint per tool. Everything else — the tool SET, the categories, the counts,
 * the discovery samples — is DERIVED from the live grammar, so this table is
 * the only thing to keep in sync, and the drift guard (`capabilities.test.ts`)
 * fails CI if a live tool has no hint or a hint names a tool that no longer
 * exists.
 *
 * `category` USED TO BE AUTHORED HERE, once per tool, and it was derivable the
 * whole time: `capabilities.test.ts` already proved `category === "write"` iff
 * the verb's `mutates` flag is set, over every tool. Thirty-six authored
 * categories were therefore thirty-six chances to write down something the
 * surface already knew — and `catalog.ts` degraded a MISSING hint to
 * `category: "read"`, so a fork that had not authored this table reported every
 * mutating tool as a read and `counts.write` as 0. It is derived in
 * `catalog.ts` now, where the mutating set is read straight off the emitted
 * surface. See `CATEGORY_BY_KERNEL_TOOL` there for the three that are not
 * derivable and why.
 *
 * `use_when` STAYS AUTHORED, and deliberately: it is agent-facing prose, one
 * line saying when an agent should reach for that tool, in the agent's decision
 * vocabulary rather than the tool's own summary. Nothing in the surface knows
 * it. This is the half a reader must maintain.
 */

import { BIN_NAME } from "../../constants.js";
import type { ToolHint } from "./types.js";

/**
 * Behavioural hints keyed by the LIVE tool name (`emitSurface` naming rule:
 * `noun` or `noun_verb`). The section comments below record the derived
 * category for a reader's benefit; nothing reads them.
 */
export const TOOL_HINTS: Record<string, ToolHint> = {
  // — Orientation ————————————————————————————————————————————————————————————
  capabilities: {
    use_when:
      "Starting a session — understand conventions, available tools, and the discovery flow",
  },

  // — Diagnostic ————————————————————————————————————————————————————————————
  doctor: {
    use_when:
      "Diagnosing environment issues — config, store, completions, MCP health",
  },
  info: {
    use_when: `Checking ${BIN_NAME} version, configuration summary, and store state`,
  },

  // — Read ——————————————————————————————————————————————————————————————————
  block_list: {
    use_when:
      "Browsing every component, pattern, layout and subcomponent in the graph",
  },
  block_lookup: {
    use_when:
      "Need full anatomy, modifiers, tokens, and standards for specific blocks by name or IRI",
  },
  block_sample: {
    use_when:
      "See actual block data shapes before querying — returns random instances each call, prevents guessing at property names",
  },
  colophon: {
    use_when: `Understanding how ${BIN_NAME} and the active domain are built — the toolchain + domain colophon, for onboarding or a demo`,
  },
  config_show: {
    use_when:
      "Checking the resolved configuration and which layer supplied each field",
  },
  graph_inspect: {
    use_when:
      "Examining all triples for a specific URI — predicates, objects, and types",
  },
  graph_query: {
    use_when:
      "Complex SPARQL joins or aggregations that other tools cannot express",
  },
  modifier_list: {
    use_when: "Listing all modifier families and their allowed values",
  },
  modifier_lookup: {
    use_when:
      "Need values and usage details for specific modifier families by name",
  },
  modifier_sample: {
    use_when:
      "See actual modifier data shapes (with value lists) before querying — returns random instances each call",
  },
  ontology_list: {
    use_when:
      "Discovering loaded namespaces, prefixes, and class/property counts",
  },
  ontology_lookup: {
    use_when:
      "Exploring the full schema of a namespace by name — classes, properties, and hierarchy",
  },
  prompt_list: {
    use_when: "Browsing the workflow prompt templates the active graph offers",
  },
  prompt_lookup: {
    use_when:
      "Fetching a specific workflow prompt template's body and arguments by name",
  },
  skill_list: {
    use_when: "Discovering agent skills provided by installed packages",
  },
  skill_lookup: {
    use_when:
      "Loading full SKILL.md instructions for a specific agent skill by name",
  },
  sources_status: {
    use_when:
      "Checking whether the local knowledge-graph pack is built and current",
  },
  standard_list: {
    use_when:
      "Browsing code standards, optionally filtered by category or search term",
  },
  standard_lookup: {
    use_when:
      "Need do/don't code examples for specific coding standards by name or IRI",
  },
  standard_categories: {
    use_when: "Discovering which standard categories exist before filtering",
  },
  standard_sample: {
    use_when:
      "See actual standard data shapes (with dos/donts) before querying — returns random instances each call",
  },
  tier_list: {
    use_when:
      "Understanding the tier hierarchy the design system is organized by",
  },
  tier_lookup: {
    use_when:
      "Resolving a tier name to its IRI, or confirming a tier name exists",
  },
  token_list: {
    use_when:
      "Browsing design tokens, optionally filtered by category (color, spacing, etc.)",
  },
  token_lookup: {
    use_when:
      "Need theme values and resolution details for specific tokens by name or IRI",
  },
  token_sample: {
    use_when:
      "See actual token data shapes (with theme values) before querying — returns random instances each call",
  },

  // — Write ——————————————————————————————————————————————————————————————————
  config_set: {
    use_when:
      "Setting any config field by name — tier, channel, or detail (e.g. `config set detail detailed`)",
  },
  create_component: {
    use_when: "Scaffolding a new component (React, Svelte, or Lit)",
  },
  create_package: {
    use_when:
      "Scaffolding a new npm package with proper monorepo configuration",
  },
  create_application: {
    use_when:
      "Scaffolding a new React application with SSR, routing, and optional Relay",
  },
  setup: {
    use_when: `Installing ${BIN_NAME}'s shell completions, MCP config, skills, and LSP into the environment`,
  },
  sources_update: {
    use_when:
      "Building or refreshing the knowledge-graph pack from the configured packs",
  },
  upgrade: {
    use_when: `Upgrading the ${BIN_NAME} CLI itself to the latest release`,
  },
};
