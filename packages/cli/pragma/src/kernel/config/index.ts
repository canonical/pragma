/**
 * Config kernel barrel — layered TS-evaluated configuration.
 *
 * `schema.ts` (zod) is intentionally not re-exported here: it is imported
 * directly and lazily by the readers, keeping this barrel — and any storeless
 * consumer — off the zod fast path.
 */

export { default as defaults } from "./defaults.js";
export { evaluateProjectConfig } from "./evaluateProjectConfig.js";
export { findProjectConfig } from "./findProjectConfig.js";
export { ensureFirstRun, firstRunTask } from "./firstRun.js";
export type { GlobalConfigRead } from "./globalConfig.js";
export { readGlobalConfig } from "./globalConfig.js";
export {
  cacheDir,
  configCacheDir,
  configDir,
  globalConfigPath,
  stateDir,
} from "./paths.js";
export { readConfig } from "./readConfig.js";
export type {
  Channel,
  ConfigLayer,
  ConfigLayers,
  ConfigOrigin,
  ConfigOrigins,
  PackageDeclaration,
  PackageEntry,
  PragmaConfig,
  RawConfig,
} from "./types.js";
export type { WriteConfigResult } from "./writeConfigField.js";
export { writeConfigField } from "./writeConfigField.js";
