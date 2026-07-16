import type { PromptDefinition } from "../types.js";

/**
 * CORE prompt: orient in the loaded knowledge graph (D6).
 *
 * One file per prompt so the catalog can be reshuffled without code
 * changes — this one rides the core, not a semantic package.
 */
export const exploreGraphPrompt: PromptDefinition = {
  name: "explore-graph",
  description:
    "Orient in the loaded knowledge graph. Use when starting work on " +
    "unfamiliar data: hydrates the loaded namespaces and real sample " +
    "shapes before you write a single query.",
  arguments: {
    topic: {
      description: "What you are looking for (free text; optional)",
    },
  },
  template: [
    "You are exploring the pragma knowledge graph. Topic of interest: {{topic}}",
    "",
    "Protocol:",
    "1. Scan the namespaces below to see which ontologies are loaded; ontology_show <prefix> lists a namespace's classes and properties.",
    "2. Before querying a data family, call its *_sample tool — real instances beat guessed property names.",
    "3. Reach entities with the <noun>_list / <noun>_lookup tools; fall back to graph_query (SPARQL) only for joins no tool expresses.",
    "4. The active tier/channel scope silently filters every list — read pragma://state (or use the fix-empty-results prompt) if results look thin.",
  ].join("\n"),
  embed: [
    { tool: "ontology_list", heading: "Loaded namespaces" },
    { tool: "block_sample", heading: "Sample data shapes" },
  ],
};
