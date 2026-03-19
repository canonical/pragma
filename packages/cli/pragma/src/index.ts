export type { PragmaConfig } from "./config.js";
export { readConfig } from "./config.js";
export { default as configExists } from "./configExists.js";
export type { Channel } from "./constants.js";
export {
  PROGRAM_DESCRIPTION,
  PROGRAM_NAME,
  VALID_CHANNELS,
  VERSION,
} from "./constants.js";
export type { ErrorCode, PragmaErrorData } from "./error/index.js";
export { ERROR_CODES, PragmaError } from "./error/index.js";
export {
  formatField,
  formatHeading,
  formatList,
  formatSection,
} from "./lib/formatTerminal.js";
export { EXIT_CODES, mapExitCode } from "./lib/mapExitCode.js";
export {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./lib/renderError.js";
export type { PackageManager } from "./pm.js";
export {
  detectLocalInstall,
  detectPackageManager,
  PM_COMMANDS,
} from "./pm.js";
export { default as resolveConfigPath } from "./resolveConfigPath.js";
export type { ConfigUpdate } from "./writeConfig.js";
export { default as writeConfig } from "./writeConfig.js";

// =============================================================================
// D3 — Shared Operation Types (TB.01)
// =============================================================================

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

// =============================================================================
// D3 — Shared Operations
// =============================================================================

export { default as getComponent } from "./domains/component/getComponent.js";
export { default as listComponents } from "./domains/component/listComponents.js";
export { default as executeQuery } from "./domains/graph/executeQuery.js";
export { default as inspectUri } from "./domains/graph/inspectUri.js";
export {
  getModifier,
  listModifiers,
} from "./domains/modifier/operations.js";
export { default as listOntologies } from "./domains/ontology/listOntologies.js";
export { default as showOntology } from "./domains/ontology/showOntology.js";
export { default as showOntologyRaw } from "./domains/ontology/showOntologyRaw.js";
export {
  getStandard,
  listCategories,
  listStandards,
} from "./domains/standard/operations.js";
export { listTiers } from "./domains/tier/operations.js";
export { getToken, listTokens } from "./domains/token/operations.js";

// =============================================================================
// D6 — Config Operations
// =============================================================================

export type { ConfigShowData } from "./domains/config/operations.js";
export {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./domains/config/operations.js";

// =============================================================================
// D3 — Store Bootstrap
// =============================================================================

export { bootStore, DEFAULT_SOURCES } from "./domains/shared/bootStore.js";
export { buildQuery } from "./domains/shared/buildQuery.js";
export { PREFIX_MAP } from "./domains/shared/prefixes.js";

// =============================================================================
// D3 — Filters
// =============================================================================

export {
  buildChannelFilter,
  CHANNEL_RELEASES,
} from "./domains/filters/buildChannelFilter.js";
export { buildFilters } from "./domains/filters/buildFilters.js";
export {
  buildTierFilter,
  resolveTierChain,
} from "./domains/filters/buildTierFilter.js";

// =============================================================================
// D9 — Info + Upgrade
// =============================================================================

export type {
  InfoData,
  RegistryCheckResult,
  StoreSummary,
  UpgradeData,
} from "./domains/info/types.js";
export { default as checkRegistryVersion } from "./domains/info/checkRegistryVersion.js";
export { collectStoreSummary } from "./domains/info/collectStoreSummary.js";
export { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS } from "./domains/info/constants.js";
export { default as infoCommand } from "./domains/info/infoCommand.js";
export { default as upgradeCommand } from "./domains/info/upgradeCommand.js";
export {
  renderInfoJson,
  renderInfoLlm,
  renderInfoPlain,
} from "./domains/info/renderInfo.js";
export {
  renderUpgradeJson,
  renderUpgradeLlm,
  renderUpgradePlain,
} from "./domains/info/renderUpgrade.js";

// =============================================================================
// D11 — MCP Adapter
// =============================================================================

export { default as createMcpServer } from "./mcp/createMcpServer.js";
export { default as registerTools } from "./mcp/registerTools.js";
export { default as serializeError } from "./mcp/serializeError.js";
export type { McpErrorPayload, McpRecovery } from "./mcp/types.js";
