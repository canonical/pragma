/**
 * The one authored input to the `capabilities` catalog: a `use_when` behavioural
 * hint + category per tool. Everything else (the tool SET, counts, discovery
 * samples) is DERIVED from the live grammar at build time, so this table is the
 * only thing to keep in sync — and the drift-guard test (`capabilities.test.ts`)
 * fails CI if a live tool has no hint, a hint names a tool that no longer
 * exists, or a hint's category disagrees with the tool's real `mutates` flag.
 *
 * `use_when` strings for the surviving tools are ported verbatim from the old
 * shell's `domains/llm/data/toolCatalog.ts`; the net-new v2 tools (config_detail,
 * graph_query, setup, upgrade, doctor, capabilities, prompt_*, token_add-config,
 * sources_*, tier_lookup, create_*) are authored here.
 */

import type { ToolHint } from "./types.js";

/**
 * Behavioural hints keyed by the LIVE tool name (`emitSurface` naming rule:
 * `noun` or `noun_verb`). Categories: `write` ⟺ the verb mutates; `orientation`
 * = the session-start map; `diagnostic` = environment/version reporting; else
 * `read`. The drift guard enforces every one of those invariants.
 */
export const TOOL_HINTS: Record<string, ToolHint> = {
  // — Orientation ————————————————————————————————————————————————————————————
  capabilities: {
    category: "orientation",
    use_when:
      "Starting a session — understand conventions, available tools, and the discovery flow",
  },

  // — Diagnostic ————————————————————————————————————————————————————————————
  doctor: {
    category: "diagnostic",
    use_when:
      "Diagnosing environment issues — config, store, completions, MCP health",
  },
  info: {
    category: "diagnostic",
    use_when: "Checking pragma version, configuration summary, and store state",
  },

  // — Read ——————————————————————————————————————————————————————————————————
  block_list: {
    category: "read",
    use_when:
      "Browsing available components, patterns, layouts under current tier/channel",
  },
  block_lookup: {
    category: "read",
    use_when:
      "Need full anatomy, modifiers, tokens, and standards for specific blocks by name or IRI",
  },
  block_sample: {
    category: "read",
    use_when:
      "See actual block data shapes before querying — returns random instances each call, prevents guessing at property names",
  },
  colophon: {
    category: "read",
    use_when:
      "Understanding how pragma and the active domain are built — the toolchain + design-system colophon, for onboarding or a demo",
  },
  config_show: {
    category: "read",
    use_when: "Checking active tier and channel before querying",
  },
  graph_inspect: {
    category: "read",
    use_when:
      "Examining all triples for a specific URI — predicates, objects, and types",
  },
  graph_query: {
    category: "read",
    use_when:
      "Complex SPARQL joins or aggregations that other tools cannot express",
  },
  modifier_list: {
    category: "read",
    use_when: "Listing all modifier families and their allowed values",
  },
  modifier_lookup: {
    category: "read",
    use_when:
      "Need values and usage details for specific modifier families by name",
  },
  modifier_sample: {
    category: "read",
    use_when:
      "See actual modifier data shapes (with value lists) before querying — returns random instances each call",
  },
  ontology_list: {
    category: "read",
    use_when:
      "Discovering loaded namespaces, prefixes, and class/property counts",
  },
  ontology_lookup: {
    category: "read",
    use_when:
      "Exploring the full schema of a namespace by name — classes, properties, and hierarchy",
  },
  ontology_show: {
    category: "read",
    use_when:
      "Deprecated alias of ontology_lookup — exploring a namespace's schema (prefer ontology_lookup)",
  },
  prompt_list: {
    category: "read",
    use_when:
      "Browsing the workflow prompt templates the design-system graph offers",
  },
  prompt_lookup: {
    category: "read",
    use_when:
      "Fetching a specific workflow prompt template's body and arguments by name",
  },
  skill_list: {
    category: "read",
    use_when: "Discovering agent skills provided by installed packages",
  },
  skill_lookup: {
    category: "read",
    use_when:
      "Loading full SKILL.md instructions for a specific agent skill by name",
  },
  sources_status: {
    category: "read",
    use_when:
      "Checking whether the local knowledge-graph pack is built and current",
  },
  standard_list: {
    category: "read",
    use_when:
      "Browsing code standards, optionally filtered by category or search term",
  },
  standard_lookup: {
    category: "read",
    use_when:
      "Need do/don't code examples for specific coding standards by name or IRI",
  },
  standard_categories: {
    category: "read",
    use_when: "Discovering which standard categories exist before filtering",
  },
  standard_sample: {
    category: "read",
    use_when:
      "See actual standard data shapes (with dos/donts) before querying — returns random instances each call",
  },
  tier_list: {
    category: "read",
    use_when: "Understanding the tier hierarchy before setting a tier filter",
  },
  tier_lookup: {
    category: "read",
    use_when: "Need the blocks scoped to a specific tier by name",
  },
  token_list: {
    category: "read",
    use_when:
      "Browsing design tokens, optionally filtered by category (color, spacing, etc.)",
  },
  token_lookup: {
    category: "read",
    use_when:
      "Need theme values and resolution details for specific tokens by name or IRI",
  },
  token_sample: {
    category: "read",
    use_when:
      "See actual token data shapes (with theme values) before querying — returns random instances each call",
  },

  // — Write ——————————————————————————————————————————————————————————————————
  config_tier: {
    category: "write",
    use_when: "Setting or resetting the active tier filter",
  },
  config_channel: {
    category: "write",
    use_when:
      "Setting the release channel (normal, experimental, or prerelease)",
  },
  config_detail: {
    category: "write",
    use_when:
      "Setting the default progressive-disclosure level (summary, standard, detailed)",
  },
  config_set: {
    category: "write",
    use_when:
      "Setting any config field by name in one call — tier, channel, or detail",
  },
  create_component: {
    category: "write",
    use_when:
      "Scaffolding a new design-system component (React, Svelte, or Lit)",
  },
  create_package: {
    category: "write",
    use_when:
      "Scaffolding a new npm package with proper monorepo configuration",
  },
  create_application: {
    category: "write",
    use_when:
      "Scaffolding a new React application with SSR, routing, and optional Relay",
  },
  setup: {
    category: "write",
    use_when:
      "Installing pragma's shell completions, MCP config, skills, and LSP into the environment",
  },
  sources_update: {
    category: "write",
    use_when:
      "Building or refreshing the knowledge-graph pack from the configured packages",
  },
  "token_add-config": {
    category: "write",
    use_when: "Generating a tokens.config.mjs for the terrazzo token pipeline",
  },
  upgrade: {
    category: "write",
    use_when: "Upgrading the pragma CLI itself to the latest release",
  },
};
