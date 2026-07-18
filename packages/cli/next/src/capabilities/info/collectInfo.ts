/**
 * Collect the `info` payload — the verb's run body (lazily imported).
 *
 * Storeless and networkless (D11): read the layered config, report the version
 * and how the binary was installed. No store boot, no registry check. Kept out
 * of the spec module (info.verb.ts imports it dynamically) so building the
 * command tree never pulls the config reader onto the `--help` fast path.
 */

import { readConfig } from "../../kernel/config/readConfig.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { InfoData } from "./types.js";

/**
 * Detect how the binary was installed — package manager and scope.
 *
 * A storeless, networkless heuristic over the process — the v1 detector's full
 * package.json walk returns with the store-backed capabilities.
 */
function detectInstallSource(): string {
  const bin = process.argv[1] ?? "";
  const scope = bin.includes("node_modules") ? "local" : "global";
  const exec = process.execPath.toLowerCase();
  const pm = exec.includes("bun")
    ? "bun"
    : exec.includes("pnpm")
      ? "pnpm"
      : exec.includes("yarn")
        ? "yarn"
        : "node";
  return `${pm} (${scope})`;
}

/**
 * Assemble the `info` data for the current runtime.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless info payload.
 * @note Impure — reads the config layers from disk.
 */
export async function collectInfo(runtime: PragmaRuntime): Promise<InfoData> {
  const layers = await readConfig(runtime.cwd);
  const { config } = layers;

  return {
    version: runtime.version,
    installSource: detectInstallSource(),
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
