/** @module Configuration reading, writing, layered resolution, and paths. */
export { default as configExists } from "./configExists.js";
export { DEFAULT_ORIGINS } from "./defaultOrigins.js";
export { default as findProjectConfigPath } from "./findProjectConfigPath.js";
export { default as mergeConfigFileUpdate } from "./mergeConfigFileUpdate.js";
export { default as parseConfigValues } from "./parseConfigValues.js";
export { default as readConfig } from "./readConfig.js";
export { default as readConfigLayers } from "./readConfigLayers.js";
export { default as resolveConfigPath } from "./resolveConfigPath.js";
export { default as resolveGlobalConfigPath } from "./resolveGlobalConfigPath.js";
export { default as resolveWriteConfigPath } from "./resolveWriteConfigPath.js";
export type {
  ConfigFileValues,
  ConfigLayer,
  ConfigLayers,
  ConfigOrigin,
  ConfigOrigins,
  ConfigScope,
  ConfigUpdate,
  PragmaConfig,
  PromptsConfig,
} from "./types.js";
export { default as writeConfig } from "./writeConfig.js";
