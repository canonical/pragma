export type { ConfigUpdate, PragmaConfig } from "./config.js";
export {
  configExists,
  isValidChannel,
  readConfig,
  resolveConfigPath,
  writeConfig,
} from "./config.js";
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

// =============================================================================
// D3 — Shared Operation Types (TB.01)
// =============================================================================

export type {
  AnatomyNode,
  AnatomyTree,
  CodeBlock,
  ComponentDetailed,
  ComponentSummary,
  FilterConfig,
  ModifierFamily,
  StandardDetailed,
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

export {
  getComponent,
  listComponents,
} from "./domains/component/operations.js";
export {
  getModifier,
  listModifiers,
} from "./domains/modifier/operations.js";
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
