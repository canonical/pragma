import type { CommandRefEntry } from "../types.js";
import { TOOL_CATALOG } from "./toolCatalog.js";

/** Look up a use_when string from the tool catalog by MCP tool name. */
function hintFor(mcpName: string): string {
  return TOOL_CATALOG.find((t) => t.name === mcpName)?.use_when ?? "";
}

/**
 * Static command reference table with approximate token-cost estimates
 * and behavioral hints for LLM tool selection.
 *
 * Used by the `pragma llm` orientation output to help LLMs budget context
 * and choose the right tool.
 */
export const COMMAND_REFERENCE: readonly CommandRefEntry[] = [
  {
    command: "block sample",
    tokens: "~600",
    use_when: hintFor("block_sample"),
  },
  { command: "block list", tokens: "~200", use_when: hintFor("block_list") },
  {
    command: "block lookup <name-or-iri...> --detailed",
    tokens: "~500",
    use_when: hintFor("block_lookup"),
  },
  {
    command: "standard sample",
    tokens: "~500",
    use_when: hintFor("standard_sample"),
  },
  {
    command: "standard list --category <cat>",
    tokens: "~100",
    use_when: hintFor("standard_list"),
  },
  {
    command: "standard lookup <name-or-iri...> --detailed",
    tokens: "~400",
    use_when: hintFor("standard_lookup"),
  },
  {
    command: "standard categories",
    tokens: "~50",
    use_when: hintFor("standard_categories"),
  },
  {
    command: "modifier sample",
    tokens: "~200",
    use_when: hintFor("modifier_sample"),
  },
  {
    command: "modifier list",
    tokens: "~100",
    use_when: hintFor("modifier_list"),
  },
  {
    command: "modifier lookup <name-or-iri...>",
    tokens: "~80",
    use_when: hintFor("modifier_lookup"),
  },
  {
    command: "token sample",
    tokens: "~300",
    use_when: hintFor("token_sample"),
  },
  { command: "token list", tokens: "~400", use_when: hintFor("token_list") },
  {
    command: "token lookup <name-or-iri...> --detailed",
    tokens: "~150",
    use_when: hintFor("token_lookup"),
  },
  { command: "tier list", tokens: "~50", use_when: hintFor("tier_list") },
  {
    command: "ontology list",
    tokens: "~80",
    use_when: hintFor("ontology_list"),
  },
  {
    command: "ontology show <prefix>",
    tokens: "~300",
    use_when: hintFor("ontology_show"),
  },
  {
    command: 'graph query "<sparql>"',
    tokens: "varies",
    use_when: hintFor("graph_query"),
  },
  {
    command: "graph inspect <uri>",
    tokens: "~200",
    use_when: hintFor("graph_inspect"),
  },
  { command: "config show", tokens: "~50", use_when: hintFor("config_show") },
  { command: "info", tokens: "~100", use_when: hintFor("info") },
];
