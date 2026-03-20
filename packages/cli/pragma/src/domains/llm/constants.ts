/**
 * Static decision trees and command reference for `pragma llm`.
 *
 * Content sourced from B.29.LLM_ORIENTATION (LO.03, LO.04).
 * Total output budget: ≤800 tokens (~3200 chars) per LO.05.
 */

import type { CommandRefEntry, DecisionTree } from "./types.js";

export const DECISION_TREES: readonly DecisionTree[] = [
  {
    intent: "Build a component",
    tree: `? Know name?
  yes → component get <name> --detailed  [~500]
        → component get <name> --standards [~300] Σ800
  no  → component list [~200] → pick → get`,
  },
  {
    intent: "Audit standards",
    tree: `? Know standard?
  yes → standard get <name> --detailed [~400]
  no  → ? Know component?
        yes → component get <name> --standards [~300]
              → standard get <std> --detailed [~400] Σ700
        no  → standard list --category <cat> [~100]
              → standard get <std> --detailed [~400] Σ500`,
  },
  {
    intent: "Find a token",
    tree: `? Know name?
  yes → token get <name> --detailed [~150]
  no  → token list --category <cat> [~100]
        → token get <name> --detailed [~150] Σ250`,
  },
  {
    intent: "Explore the design system",
    tree: `high-level → ontology list [~80] → ontology show <ns> [~300]
modifiers  → modifier list [~100] → modifier get <name> [~80]
tiers      → tier list [~50]
raw        → graph query "SELECT ..." → graph inspect <uri> [~200]`,
  },
  {
    intent: "Configure",
    tree: `tier    → config tier <path> → config show [~50]
channel → config channel <value> (normal|experimental|prerelease)
status  → info [~100]`,
  },
];

export const COMMAND_REFERENCE: readonly CommandRefEntry[] = [
  { command: "component list", tokens: "~200" },
  { command: "component get <name> --detailed", tokens: "~500" },
  { command: "component get <name> --standards", tokens: "~300" },
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
  { command: "graph query \"<sparql>\"", tokens: "varies" },
  { command: "graph inspect <uri>", tokens: "~200" },
  { command: "config show", tokens: "~50" },
  { command: "info", tokens: "~100" },
];
