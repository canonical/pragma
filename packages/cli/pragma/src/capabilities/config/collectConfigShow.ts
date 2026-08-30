/**
 * Collect the `config show` payload — the verb's run body (lazily imported).
 *
 * Storeless: read the layered config and pass it through with its provenance,
 * minus the declared story BODIES (see {@link withoutStoryBodies}). Dynamic-
 * imported by the spec so building the tree never pulls the config reader (or
 * zod) onto the fast path.
 */

import { readConfig } from "../../kernel/config/readConfig.js";
import type {
  PackDeclaration,
  PragmaConfig,
} from "../../kernel/config/types.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { ConfigShowData } from "./types.js";

/** A pack declaration with any declared story bodies dropped. */
function nameAndSourceOnly(pack: PackDeclaration): PackDeclaration {
  if (typeof pack === "string") return pack;
  return {
    name: pack.name,
    ...(pack.source === undefined ? {} : { source: pack.source }),
  };
}

/**
 * The effective config with declared story BODIES dropped — `packs` entries keep
 * `{ name, source }`, and the top-level `stories` array is omitted.
 *
 * A PROJECTION of the payload, not a hiding of config: `origins` still reports
 * where `packs` and `stories` came from, the plain and llm renders already print
 * pack NAMES only, and `pragma capabilities` lists the verbs the stories
 * produce. It exists because the bodies are SPARQL — the distribution's own five
 * stories take `config show --format json` from 1.3 KB to 11 KB, and MCP returns
 * the JSON formatter's output, so every `config_show` tool call would carry
 * ~2.7k tokens of query text: the largest payload in the surface, for its least
 * useful content.
 */
function withoutStoryBodies(config: PragmaConfig): PragmaConfig {
  const { stories, ...rest } = config;
  return {
    ...rest,
    ...(config.packs === undefined
      ? {}
      : { packs: config.packs.map(nameAndSourceOnly) }),
  };
}

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
    config: withoutStoryBodies(layers.config),
    origins: layers.origins,
    ...(layers.project.path ? { projectConfigPath: layers.project.path } : {}),
    globalConfigPath: layers.global.path,
    projectExists: layers.project.exists,
    globalExists: layers.global.exists,
  };
}
