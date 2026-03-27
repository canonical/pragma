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
    tree: `? Know IRI or name?
  yes → block lookup <name-or-iri> --detailed  [~500]
  no  → block list [~200] → pick compact IRI → lookup`,
  },
  {
    intent: "Audit standards",
    tree: `? Know standard IRI or name?
  yes → standard lookup <name-or-iri> --detailed [~400]
  no  → ? Know block IRI or name?
      yes → block lookup <name-or-iri> --detailed [~500]
        → inspect related guidance manually Σ500
        no  → standard list --category <cat> [~100]
              → standard lookup <std-iri> --detailed [~400] Σ500`,
  },
  {
    intent: "Find a token",
    tree: `? Know token IRI or name?
  yes → token lookup <name-or-iri> --detailed [~150]
  no  → token list --category <cat> [~100]
        → token lookup <name-or-iri> --detailed [~150] Σ250`,
  },
  {
    intent: "Explore the design system",
    tree: `high-level → ontology list [~80] → ontology show <ns> [~300]
modifiers  → modifier list [~100] → modifier lookup <name-or-iri> [~80]
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
