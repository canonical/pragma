/**
 * Command reference with token estimates for `pragma llm`.
 *
 * @see LO.04 in B.29.LLM_ORIENTATION
 */

import type { CommandRefEntry } from "../types.js";

export const COMMAND_REFERENCE: readonly CommandRefEntry[] = [
  { command: "block list", tokens: "~200" },
  { command: "block get <name> --detailed", tokens: "~500" },
  { command: "block get <name> --standards", tokens: "~300" },
  { command: "standard list --category <cat>", tokens: "~100" },
  { command: "standard get <name> --detailed", tokens: "~400" },
  { command: "standard categories", tokens: "~50" },
  { command: "modifier list", tokens: "~100" },
  { command: "modifier get <name>", tokens: "~80" },
  { command: "token list", tokens: "~400" },
  { command: "token get <name> --detailed", tokens: "~150" },
  { command: "tier list", tokens: "~50" },
  { command: "ontology list", tokens: "~80" },
  { command: "ontology show <prefix>", tokens: "~300" },
  { command: 'graph query "<sparql>"', tokens: "varies" },
  { command: "graph inspect <uri>", tokens: "~200" },
  { command: "config show", tokens: "~50" },
  { command: "info", tokens: "~100" },
];
