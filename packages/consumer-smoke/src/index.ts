/**
 * @canonical/consumer-smoke
 *
 * Consumer-installability guards for the pragma monorepo:
 *
 * - workspace enumeration exactly as the root `workspaces` globs see it;
 * - one shared npm-registry status client (publication + provenance),
 *   implemented as parallel, deterministic, mockable @canonical/task
 *   effects — also consumed by scripts/publish-status.ts;
 * - pure analysis: the private/unpublished dependency-edge guard and the
 *   release-readiness inventory of never-published packages;
 * - `npm pack --json` parsing helpers;
 * - environment scrubbing for spawned child processes.
 *
 * CLI entrypoints (run with bun):
 *   src/check-no-private-deps.ts  — edge guard + unpublished inventory
 *   src/pack-and-smoke.ts         — external-consumer pack/install/build smoke
 *   src/list-publishable.ts       — publishable package names for Nx filters
 */

export {
  type Analysis,
  type AnalyzeInput,
  analyze,
  type CheckMode,
  collectRegistryLookups,
  type Finding,
  type InventoryEntry,
} from "./analysis.js";
export {
  SENSITIVE_ENV_EXACT,
  SENSITIVE_ENV_PATTERN,
  scrubbedEnv,
  scrubProcessEnv,
} from "./env.js";
export { type PackOutput, packFilename, parsePackJson } from "./npm-pack.js";
export {
  classifyNpmView,
  fetchRegistryStatuses,
  npmViewArgs,
  type RegistryClientOptions,
  type RegistryStatus,
  registryStatusesTask,
  registryStatusTask,
} from "./registry.js";
export {
  findRepoRoot,
  getPublishablePackages,
  getWorkspacePackages,
  repoRoot,
  type WorkspacePackage,
} from "./workspace.js";
