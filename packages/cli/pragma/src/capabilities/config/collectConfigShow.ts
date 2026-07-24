/**
 * Collect the `config show` payload — the verb's run body (lazily imported).
 *
 * Storeless: read the layered config and pass it through with its provenance.
 * Dynamic-imported by the spec so building the tree never pulls the config
 * reader (or zod) onto the fast path.
 */

import { readConfig } from "../../kernel/config/readConfig.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { ConfigShowData } from "./types.js";

/**
 * Assemble the resolved config with provenance for the current runtime.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The config-show payload.
 * @note Impure — reads the config layers from disk.
 */
export async function collectConfigShow(
  runtime: PragmaRuntime,
): Promise<ConfigShowData> {
  const layers = await readConfig(runtime.cwd);
  return {
    config: layers.config,
    origins: layers.origins,
    ...(layers.project.path ? { projectConfigPath: layers.project.path } : {}),
    globalConfigPath: layers.global.path,
    projectExists: layers.project.exists,
    globalExists: layers.global.exists,
  };
}
