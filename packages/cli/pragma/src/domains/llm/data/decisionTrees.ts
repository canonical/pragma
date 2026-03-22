/**
 * Static decision trees for `pragma llm`.
 *
 * @see LO.03 in B.29.LLM_ORIENTATION
 */

import type { DecisionTree } from "../types.js";

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
