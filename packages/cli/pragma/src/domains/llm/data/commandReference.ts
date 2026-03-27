import type { CommandRefEntry } from "../types.js";

/**
 * Static command reference table with approximate token-cost estimates.
 *
 * Used by the `pragma llm` orientation output to help LLMs budget context.
 */
export const COMMAND_REFERENCE: readonly CommandRefEntry[] = [
  { command: "block list", tokens: "~200" },
  { command: "block lookup <name-or-iri...> --detailed", tokens: "~500" },
  { command: "standard list --category <cat>", tokens: "~100" },
  { command: "standard lookup <name-or-iri...> --detailed", tokens: "~400" },
  { command: "standard categories", tokens: "~50" },
  { command: "modifier list", tokens: "~100" },
  { command: "modifier lookup <name-or-iri...>", tokens: "~80" },
  { command: "token list", tokens: "~400" },
  { command: "token lookup <name-or-iri...> --detailed", tokens: "~150" },
  { command: "tier list", tokens: "~50" },
  { command: "ontology list", tokens: "~80" },
  { command: "ontology show <prefix>", tokens: "~300" },
  { command: 'graph query "<sparql>"', tokens: "varies" },
  { command: "graph inspect <uri>", tokens: "~200" },
  { command: "config show", tokens: "~50" },
  { command: "info", tokens: "~100" },
];
