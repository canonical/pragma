/**
 * Collect the `info` payload — the verb's run body (lazily imported).
 *
 * STORELESS but network-aware (PR6): reads the layered config, reports the
 * version and install source, then enriches with (a) an update-check against
 * the npm registry — this deliberately REVERSES PR1's networkless-D11 stance for
 * `info` (the reversal IS the enrichment), unconditional because the covenant
 * `info` verb carries no flag, 3s timeout, silent-fail — and (b) a storeless
 * entity total from the pack index (`readPackIndex`, the same reader `sources
 * status` uses). Neither enrichment boots the store, so the storeless-guarantee
 * spy still sees `store.booted === false`. Kept out of the spec module so
 * building the command tree never pulls it onto the `--help` fast path.
 */

import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { readConfig } from "../../kernel/config/readConfig.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import {
  detectInstallSource,
  pmUpdateCommand,
} from "../shared/packageManager.js";
import { checkRegistryVersion, PRAGMA_PACKAGE } from "../shared/registry.js";
import type { InfoData, InfoUpdate } from "./types.js";

/**
 * Assemble the `info` data for the current runtime.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless (network-aware) info payload.
 * @note Impure — reads the config layers + pack index from disk and checks the
 *   registry (never boots the store).
 */
export async function collectInfo(runtime: PragmaRuntime): Promise<InfoData> {
  const layers = await readConfig(runtime.cwd);
  const { config } = layers;
  const install = detectInstallSource();

  // Update-check: unconditional (no flag exists), 3s timeout, silent-fail.
  const registry = await checkRegistryVersion(PRAGMA_PACKAGE, config.channel);
  const update: InfoUpdate | undefined =
    registry && registry.latest !== runtime.version
      ? {
          current: runtime.version,
          latest: registry.latest,
          command: pmUpdateCommand(install.pm, PRAGMA_PACKAGE),
        }
      : undefined;
  const updateSkipped = registry === undefined;

  // Entity total: storeless — the same pack-index reader `sources status` uses.
  const index = readPackIndex(runtime.cwd);
  const entities = index
    ? Object.values(index.instanceCountByType).reduce((sum, n) => sum + n, 0)
    : undefined;

  return {
    version: runtime.version,
    installSource: install.label,
    ...(update ? { update } : {}),
    updateSkipped,
    ...(entities !== undefined ? { entities } : {}),
    config: {
      ...(config.tier !== undefined ? { tier: config.tier } : {}),
      channel: config.channel,
      ...(config.detail !== undefined ? { detail: config.detail } : {}),
      origins: layers.origins,
      ...(layers.project.path
        ? { projectConfigPath: layers.project.path }
        : {}),
      globalConfigPath: layers.global.path,
      projectExists: layers.project.exists,
      globalExists: layers.global.exists,
    },
  };
}
