export {
  defaultBandOf,
  readMcpConfig,
  readMcpConfigFrom,
  removeMcpConfig,
  removeMcpConfigFrom,
  resolveConfigTarget,
  writeMcpConfig,
  writeMcpConfigTargets,
  writeMcpConfigTo,
} from "./config.js";
export {
  groupConfigTargets,
  groupTargetsForScope,
  isHarnessInBand,
  listHarnessesForBand,
  resolveBandsForScope,
  type ScopeSelection,
  type TargetGroup,
} from "./configTargets.js";
export { default as detectHarnesses } from "./detectHarnesses.js";
export { default as findHarnessById } from "./findHarnessById.js";
export { default as harnesses } from "./harnesses.js";
export {
  type PlatformEnv,
  type PlatformId,
  readPlatformEnv,
  userConfigBase,
  userDataBase,
  userHome,
} from "./platformPaths.js";
export type { DetectContext } from "./signals.js";
export type {
  ConfigTarget,
  DetectedHarness,
  DetectionSignal,
  HarnessDefinition,
  HarnessScope,
  McpServerConfig,
  ScopeBand,
} from "./types.js";
