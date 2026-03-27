import type { EntityDisplayConfig } from "../shared/contracts.js";
import { P } from "../shared/prefixes.js";
import type {
  FilterConfig,
  StandardDetailed,
  StandardDigest,
  StandardSummary,
} from "../shared/types/index.js";

/** Display-contract configuration for code-standard entities. */
export const standardConfig: EntityDisplayConfig<
  StandardSummary,
  StandardDigest,
  StandardDetailed
> = {
  domain: "standard",
  entityName: "standard",
  rdfTypes: [`${P.cs}CodeStandard`],
  listColumns: [
    { key: "uri", label: "IRI" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "description", label: "Description" },
  ],
  digestColumns: [{ key: "extends", label: "Extends", showWhenEmpty: false }],
  lookupSections: [
    { key: "description", heading: "Description", kind: "field" },
    { key: "extends", heading: "Extends", kind: "field", showWhenEmpty: false },
    { key: "dos", heading: "Do", kind: "table", showWhenEmpty: false },
    { key: "donts", heading: "Don't", kind: "table", showWhenEmpty: false },
  ],
  emptyRecovery: (_filters: FilterConfig) => ({
    message: "List available standards.",
    cli: "pragma standard list",
    mcp: { tool: "standard_list" },
  }),
  notFoundRecovery: (_query: string) => ({
    message: "List available standards.",
    cli: "pragma standard list",
    mcp: { tool: "standard_list" },
  }),
};
