/**
 * Collect the `info` payload — the verb's run body (lazily imported).
 *
 * STORELESS but network-aware (PR6): reads the layered config, reports the
 * version and install source, then enriches with (a) an update-check against
 * the npm registry — this deliberately REVERSES PR1's networkless-D11 stance for
 * `info` (the reversal IS the enrichment), unconditional because the covenant
 * `info` verb carries no flag, 3s timeout, silent-fail — and (b) a storeless
 * entity total, read from the index of whichever pack the boot decision names
 * (`resolveSources` → `readPackIndex`, the same predicate `sources status` and
 * `doctor` switch on) so `info` never counts a graph this project's reads
 * refuse. Neither enrichment boots the store, so the storeless-guarantee spy
 * still sees `store.booted === false`. Kept out of the spec module so building
 * the command tree never pulls it onto the `--help` fast path.
 */

import {
  entityTotal,
  readPackIndex,
} from "../../kernel/completion/entitySource.js";
import { readConfig } from "../../kernel/config/index.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import { resolveSources } from "../../kernel/runtime/resolveSources.js";
import {
  checkRegistryVersion,
  detectInstallSource,
  PRAGMA_PACKAGE,
  pmUpdateCommand,
  updateGuidance,
} from "../shared/index.js";
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
  // Only a GLOBAL install gets a command; every other state gets the honest
  // guidance sentence — a confidently wrong `npm i -g` against a linked
  // checkout would overwrite the development link.
  const update: InfoUpdate | undefined =
    registry && registry.latest !== runtime.version
      ? {
          current: runtime.version,
          latest: registry.latest,
          ...(install.kind === "global"
            ? { command: pmUpdateCommand(install, PRAGMA_PACKAGE) }
            : { guidance: updateGuidance(install) }),
        }
      : undefined;
  const updateSkipped = registry === undefined;

  // Entity total: storeless, over the pack the boot decision names — so a
  // configured-but-unbuilt project reports no total rather than the snapshot's.
  const index = readPackIndex(resolveSources(layers, runtime.cwd));
  const entities = index ? entityTotal(index) : undefined;

  return {
    version: runtime.version,
    installSource: install.label,
    installKind: install.kind,
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
