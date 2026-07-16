/** Tool catalog with behavioral hints for agent orientation. */

export interface ToolEntry {
  readonly name: string;
  readonly category: "read" | "write" | "orientation" | "diagnostic";
  readonly use_when: string;
}

/** All registered MCP tools with category and behavioral guidance. */
export const TOOL_CATALOG: readonly ToolEntry[] = [
  // — Read ————————————————————————————————————————————————————————————————————
  {
    name: "block_list",
    category: "read",
    use_when:
      "Browsing available components, patterns, layouts under current tier/channel",
  },
  {
    name: "block_lookup",
    category: "read",
    use_when:
      "Need anatomy, modifiers, properties, and usage guidance for specific blocks by name",
  },
  {
    name: "standard_list",
    category: "read",
    use_when:
      "Browsing code standards, optionally filtered by category or search term",
  },
  {
    name: "standard_lookup",
    category: "read",
    use_when:
      "Need do/don't code examples for specific coding standards by name or IRI",
  },
  {
    name: "standard_categories",
    category: "read",
    use_when: "Discovering which standard categories exist before filtering",
  },
  {
    name: "modifier_list",
    category: "read",
    use_when: "Listing all modifier families and their allowed values",
  },
  {
    name: "modifier_lookup",
    category: "read",
    use_when:
      "Need values and usage details for specific modifier families by name",
  },
  {
    name: "token_list",
    category: "read",
    use_when: "Browsing all design tokens with their type",
  },
  {
    name: "token_lookup",
    category: "read",
    use_when: "Need type and theme values for specific tokens by name",
  },
  {
    name: "tier_list",
    category: "read",
    use_when: "Understanding the tier hierarchy before setting a tier filter",
  },
  {
    name: "config_show",
    category: "read",
    use_when: "Checking active tier and channel before querying",
  },
  {
    name: "ontology_list",
    category: "read",
    use_when:
      "Discovering loaded namespaces, prefixes, and class/property counts",
  },
  {
    name: "ontology_show",
    category: "read",
    use_when:
      "Exploring the full schema of a namespace — classes, properties, and hierarchy",
  },
  {
    name: "graph_query",
    category: "read",
    use_when:
      "Complex SPARQL joins or aggregations that other tools cannot express",
  },
  {
    name: "graph_inspect",
    category: "read",
    use_when:
      "Examining all triples for a specific URI — predicates, objects, and types",
  },
  {
    name: "skill_list",
    category: "read",
    use_when: "Discovering agent skills provided by installed packages",
  },
  {
    name: "skill_lookup",
    category: "read",
    use_when:
      "Loading full SKILL.md instructions for a specific agent skill by name",
  },
  {
    name: "block_sample",
    category: "read",
    use_when:
      "See actual block data shapes before querying — returns random instances each call, prevents guessing at property names",
  },
  {
    name: "standard_sample",
    category: "read",
    use_when:
      "See actual standard data shapes (with dos/donts) before querying — returns random instances each call",
  },
  {
    name: "token_sample",
    category: "read",
    use_when:
      "See actual token data shapes (with theme values) before querying — returns random instances each call",
  },
  {
    name: "modifier_sample",
    category: "read",
    use_when:
      "See actual modifier data shapes (with value lists) before querying — returns random instances each call",
  },

  // — Write ———————————————————————————————————————————————————————————————————
  {
    name: "config_tier",
    category: "write",
    use_when: "Setting or resetting the active tier filter",
  },
  {
    name: "config_channel",
    category: "write",
    use_when:
      "Setting the release channel (normal, experimental, or prerelease)",
  },
  {
    name: "tokens_add_config",
    category: "write",
    use_when: "Generating a tokens.config.mjs for the terrazzo token pipeline",
  },
  {
    name: "create_component",
    category: "write",
    use_when:
      "Scaffolding a new design system component (React, Svelte, or Lit)",
  },
  {
    name: "create_package",
    category: "write",
    use_when:
      "Scaffolding a new npm package with proper monorepo configuration",
  },
  {
    name: "create_application",
    category: "write",
    use_when:
      "Scaffolding a new React application with SSR, routing, and optional Relay",
  },
  {
    name: "create_domain",
    category: "write",
    use_when: "Scaffolding a new domain module inside an existing application",
  },
  {
    name: "create_route",
    category: "write",
    use_when: "Scaffolding a new route inside an existing application",
  },
  {
    name: "create_wrapper",
    category: "write",
    use_when: "Scaffolding a new wrapper component inside an application",
  },

  // — Orientation —————————————————————————————————————————————————————————————
  {
    name: "llm",
    category: "orientation",
    use_when:
      "Need live context, decision trees, and command reference for design system work",
  },
  {
    name: "capabilities",
    category: "orientation",
    use_when:
      "Starting a session — understand conventions, available tools, and discovery flow",
  },

  // — Diagnostic ——————————————————————————————————————————————————————————————
  {
    name: "doctor",
    category: "diagnostic",
    use_when:
      "Diagnosing environment issues — config, store, completions, MCP health",
  },
  {
    name: "info",
    category: "diagnostic",
    use_when: "Checking pragma version, configuration summary, and store state",
  },
];
