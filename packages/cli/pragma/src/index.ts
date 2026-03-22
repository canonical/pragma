/**
 * Public API surface for @canonical/pragma.
 *
 * Exports types, boot functions, domain operations, and the MCP adapter.
 * Internal formatters, command builders, and infrastructure are not exported.
 */

// — Config & Error ————————————————————————————————————————————————————————————

export type { PragmaConfig } from "./config/index.js";
export { readConfig } from "./config/index.js";
export type { ErrorCode, PragmaErrorData } from "./error/index.js";
export { PragmaError } from "./error/index.js";

// — Runtime ———————————————————————————————————————————————————————————————————

export type { PragmaRuntime } from "./domains/shared/runtime.js";
export { bootPragma } from "./domains/shared/runtime.js";

// — Shared Types (TB.01) —————————————————————————————————————————————————————

export type {
  AnatomyNode,
  AnatomyTree,
  CategorySummary,
  CodeBlock,
  ComponentDetailed,
  ComponentSummary,
  FilterConfig,
  InspectResult,
  ModifierFamily,
  OntologyClass,
  OntologyDetailed,
  OntologyProperty,
  OntologySummary,
  PredicateGroup,
  StandardDetailed,
  StandardListFilters,
  StandardRef,
  StandardSummary,
  TierEntry,
  TokenDetailed,
  TokenRef,
  TokenSummary,
} from "./domains/shared/types.js";

// — Domain Operations —————————————————————————————————————————————————————————

export {
  getComponent,
  listComponents,
} from "./domains/component/operations/index.js";
export { runChecks } from "./domains/doctor/operations/index.js";
export {
  executeQuery,
  inspectUri,
} from "./domains/graph/operations/index.js";
export {
  getModifier,
  listModifiers,
} from "./domains/modifier/operations/index.js";
export {
  listOntologies,
  showOntology,
  showOntologyRaw,
} from "./domains/ontology/operations/index.js";
export {
  discoverSkills,
  listSkills,
} from "./domains/skill/operations/index.js";
export {
  getStandard,
  listCategories,
  listStandards,
} from "./domains/standard/operations/index.js";
export { listTiers } from "./domains/tier/operations/index.js";
export { getToken, listTokens } from "./domains/token/operations/index.js";

// — Domain Types ——————————————————————————————————————————————————————————————

export type { ConfigShowData } from "./domains/config/operations/index.js";
export type {
  CheckContext,
  CheckResult,
  DoctorData,
} from "./domains/doctor/operations/index.js";
export type {
  InfoData,
  RegistryCheckResult,
  StoreSummary,
  UpgradeData,
} from "./domains/info/types.js";
export type { SkillListResult } from "./domains/skill/operations/index.js";
export type {
  DiscoveredSkill,
  SkillFrontmatter,
  SkillSource,
} from "./domains/skill/types.js";

// — MCP Adapter ——————————————————————————————————————————————————————————————

export {
  createMcpServer,
  createMcpServerFromRuntime,
} from "./mcp/index.js";
export { default as registerAllTools } from "./mcp/tools/index.js";
export type { McpErrorPayload, McpRecovery } from "./mcp/types.js";
