import type { DecisionTree } from "../types.js";

/**
 * Static decision trees guiding LLMs through common pragma workflows.
 *
 * Each tree maps an intent (e.g. "Build a block") to a compact ASCII
 * flowchart with token-cost annotations.
 */
export const DECISION_TREES: readonly DecisionTree[] = [
  {
    intent: "Build a block",
    tree: `? Know name?
  yes → block lookup <name> --detailed  [~500]
        → block lookup <name> --standards [~300] Σ800
  no  → block list [~200] → pick → lookup`,
  },
  {
    intent: "Audit standards",
    tree: `? Know standard?
  yes → standard lookup <name> --detailed [~400]
  no  → standard categories [~80] → pick category
        → standard list --category <cat> [~100] → pick standard
        → standard lookup <std> --detailed [~400] Σ580`,
  },
  {
    intent: "Find a token",
    tree: `? Know name?
  yes → token lookup <name> --detailed [~150]
  no  → token list --category <cat> [~100]
        → token lookup <name> --detailed [~150] Σ250`,
  },
  {
    intent: "Explore the design system",
    tree: `high-level → ontology list [~80] → ontology show <ns> [~300]
modifiers  → modifier list [~100] → modifier lookup <name> [~80]
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
