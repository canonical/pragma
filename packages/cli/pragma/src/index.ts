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
// D3 — Shared Operation Types
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
} from "./lib/domains/shared/types.js";

// =============================================================================
// D3 — Shared Operations
// =============================================================================

export { getComponent } from "./lib/domains/component/getComponent.js";
export { listComponents } from "./lib/domains/component/listComponents.js";
export { default as executeQuery } from "./lib/domains/graph/executeQuery.js";
export { default as inspectUri } from "./lib/domains/graph/inspectUri.js";
export { getModifier } from "./lib/domains/modifier/getModifier.js";
export { listModifiers } from "./lib/domains/modifier/listModifiers.js";
export { default as listOntologies } from "./lib/domains/ontology/listOntologies.js";
export { default as showOntology } from "./lib/domains/ontology/showOntology.js";
export { default as showOntologyRaw } from "./lib/domains/ontology/showOntologyRaw.js";
export { getStandard } from "./lib/domains/standard/getStandard.js";
export { listCategories } from "./lib/domains/standard/listCategories.js";
export { listStandards } from "./lib/domains/standard/listStandards.js";
export { listTiers } from "./lib/domains/tier/listTiers.js";
export { getToken } from "./lib/domains/token/getToken.js";
export { listTokens } from "./lib/domains/token/listTokens.js";

// =============================================================================
// D6 — Config Operations
// =============================================================================

export type { ConfigShowData } from "./lib/domains/config/operations.js";
export {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./lib/domains/config/operations.js";

// =============================================================================
// D3 — Store Bootstrap
// =============================================================================

export { bootStore, DEFAULT_SOURCES } from "./lib/domains/shared/bootStore.js";
export { buildQuery } from "./lib/domains/shared/buildQuery.js";
export { PREFIX_MAP } from "./lib/domains/shared/prefixes.js";

// =============================================================================
// D3 — Filters
// =============================================================================

export {
  buildChannelFilter,
  CHANNEL_RELEASES,
} from "./lib/domains/filters/buildChannelFilter.js";
export { buildFilters } from "./lib/domains/filters/buildFilters.js";
export {
  buildTierFilter,
  resolveTierChain,
} from "./lib/domains/filters/buildTierFilter.js";
