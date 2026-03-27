import type { EntityDisplayConfig } from "../shared/contracts.js";
import { P } from "../shared/prefixes.js";
import type {
  FilterConfig,
  TokenDetailed,
  TokenDigest,
  TokenSummary,
} from "../shared/types/index.js";

/** Display-contract configuration for design-token entities. */
export const tokenConfig: EntityDisplayConfig<
  TokenSummary,
  TokenDigest,
  TokenDetailed
> = {
  domain: "token",
  entityName: "token",
  rdfTypes: [`${P.ds}Token`],
  listColumns: [
    { key: "uri", label: "IRI" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
  ],
  digestColumns: [],
  lookupSections: [
    { key: "values", heading: "Values", kind: "table", showWhenEmpty: false },
  ],
  emptyRecovery: (_filters: FilterConfig) => ({
    message: "List available tokens.",
    cli: "pragma token list",
    mcp: { tool: "token_list" },
  }),
  notFoundRecovery: (_query: string) => ({
    message: "List available tokens.",
    cli: "pragma token list",
    mcp: { tool: "token_list" },
  }),
};
