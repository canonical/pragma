import type { EntityDisplayConfig } from "../shared/contracts.js";
import { P } from "../shared/prefixes.js";
import type {
  BlockDetailed,
  BlockDigest,
  BlockSummary,
  FilterConfig,
} from "../shared/types/index.js";

/** Display-contract configuration for block entities (components, patterns, layouts). */
export const blockConfig: EntityDisplayConfig<
  BlockSummary,
  BlockDigest,
  BlockDetailed
> = {
  domain: "block",
  entityName: "block",
  rdfTypes: [
    `${P.ds}Component`,
    `${P.ds}Pattern`,
    `${P.ds}Layout`,
    `${P.ds}Subcomponent`,
  ],
  listColumns: [
    { key: "uri", label: "IRI" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "tier", label: "Tier" },
    {
      key: "modifiers",
      label: "Modifiers",
      showWhenEmpty: false,
      format: (value) =>
        Array.isArray(value)
          ? value.filter((entry) => typeof entry === "string").join(", ")
          : "",
    },
    {
      key: "implementations",
      label: "Implementations",
      showWhenEmpty: false,
      format: (value) =>
        Array.isArray(value)
          ? value
              .filter(
                (entry): entry is { framework: string; available: boolean } =>
                  typeof entry === "object" &&
                  entry !== null &&
                  "framework" in entry &&
                  "available" in entry,
              )
              .filter((entry) => entry.available)
              .map((entry) => entry.framework)
              .join(", ")
          : "",
    },
    {
      key: "nodeCount",
      label: "Nodes",
      showWhenEmpty: false,
      format: (value) =>
        typeof value === "number" && value > 0 ? String(value) : "",
    },
    {
      key: "tokenCount",
      label: "Tokens",
      showWhenEmpty: false,
      format: (value) =>
        typeof value === "number" && value > 0 ? String(value) : "",
    },
  ],
  digestColumns: [{ key: "summary", label: "Summary", showWhenEmpty: false }],
  lookupSections: [
    { key: "summary", heading: "Summary", kind: "field" },
    { key: "whenToUse", heading: "When to use", kind: "field" },
    { key: "whenNotToUse", heading: "When not to use", kind: "field" },
    { key: "guidelines", heading: "Guidelines", kind: "field" },
    { key: "anatomy", heading: "Anatomy", kind: "tree" },
    { key: "anatomyDsl", heading: "Anatomy (DSL)", kind: "code" },
    { key: "anatomyClassic", heading: "Anatomy (classic)", kind: "field" },
    { key: "modifierFamilies", heading: "Modifiers", kind: "table" },
    { key: "properties", heading: "Properties", kind: "nested-table" },
    { key: "subcomponents", heading: "Subcomponents", kind: "tree" },
    { key: "implementationPaths", heading: "Implementations", kind: "list" },
    { key: "tokens", heading: "Tokens", kind: "list" },
  ],
  emptyRecovery: (_filters: FilterConfig) => ({
    message: "List visible blocks.",
    cli: "pragma block list",
    mcp: { tool: "block_list" },
  }),
  notFoundRecovery: (_query: string) => ({
    message: "List visible blocks.",
    cli: "pragma block list",
    mcp: { tool: "block_list" },
  }),
};
