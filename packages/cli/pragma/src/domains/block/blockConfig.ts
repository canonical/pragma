import type { EntityDisplayConfig } from "../shared/contracts.js";
import { P } from "../shared/prefixes.js";
import type {
  BlockDetailed,
  BlockDigest,
  BlockSummary,
  FilterConfig,
} from "../shared/types.js";

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
  ],
  digestColumns: [{ key: "summary", label: "Summary", showWhenEmpty: false }],
  lookupSections: [
    { key: "summary", heading: "Summary", kind: "field" },
    { key: "whenToUse", heading: "When to use", kind: "field" },
    { key: "whenNotToUse", heading: "When not to use", kind: "field" },
    { key: "guidelines", heading: "Guidelines", kind: "field" },
    { key: "anatomyDsl", heading: "Anatomy (DSL)", kind: "code" },
    { key: "anatomyClassic", heading: "Anatomy (classic)", kind: "field" },
    { key: "modifierFamilies", heading: "Modifier Families", kind: "table" },
    { key: "properties", heading: "Properties", kind: "nested-table" },
    { key: "subcomponents", heading: "Subcomponents", kind: "list" },
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
