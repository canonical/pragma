import type { EntityDisplayConfig } from "../shared/contracts.js";
import { P } from "../shared/prefixes.js";
import type {
  FilterConfig,
  ModifierDetailed,
  ModifierDigest,
  ModifierSummary,
} from "../shared/types/index.js";

/** Display-contract configuration for modifier-family entities. */
export const modifierConfig: EntityDisplayConfig<
  ModifierSummary,
  ModifierDigest,
  ModifierDetailed
> = {
  domain: "modifier",
  entityName: "modifier",
  rdfTypes: [`${P.ds}ModifierFamily`],
  listColumns: [
    { key: "uri", label: "IRI" },
    { key: "name", label: "Name" },
    { key: "values", label: "Values", showWhenEmpty: false },
  ],
  digestColumns: [],
  lookupSections: [{ key: "values", heading: "Values", kind: "list" }],
  emptyRecovery: (_filters: FilterConfig) => ({
    message: "List available modifier families.",
    cli: "pragma modifier list",
    mcp: { tool: "modifier_list" },
  }),
  notFoundRecovery: (_query: string) => ({
    message: "List available modifier families.",
    cli: "pragma modifier list",
    mcp: { tool: "modifier_list" },
  }),
};
