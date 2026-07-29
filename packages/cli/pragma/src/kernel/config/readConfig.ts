/**
 * Resolve the layered configuration with per-field provenance.
 *
 * Layer order, least to most specific: the built-in {@link defaults}, the
 * global XDG JSON, and the nearest evaluated `pragma.config.ts`. Merging is
 * per field — a more specific layer wins wholesale (so `packs` *replaces*,
 * preserving the "project pins exactly" semantics) — and each field records
 * the layer that supplied it. Async because the project layer is evaluated
 * (and content-hash cached).
 */

import defaults from "./defaults.js";
import { evaluateProjectConfig } from "./evaluateProjectConfig.js";
import { findProjectConfig } from "./findProjectConfig.js";
import { readGlobalConfig } from "./globalConfig.js";
import type {
  Channel,
  ConfigLayers,
  ConfigOrigin,
  PragmaConfig,
  RawConfig,
} from "./types.js";

/**
 * Read and merge the config layers for a working directory.
 *
 * @param cwd - Directory the project layer is resolved from.
 * @returns The effective config, per-field origins, and layer metadata.
 * @throws PragmaError with code `CONFIG_ERROR` when a layer is invalid.
 * @note Impure — reads config files (and may evaluate `pragma.config.ts`).
 */
export async function readConfig(
  cwd: string = process.cwd(),
): Promise<ConfigLayers> {
  const global = readGlobalConfig();
  const projectPath = findProjectConfig(cwd);
  const project: RawConfig = projectPath
    ? await evaluateProjectConfig(projectPath)
    : {};
  const defaultValues = defaults as RawConfig;

  const pick = <K extends keyof RawConfig>(
    field: K,
  ): { value: RawConfig[K] | undefined; origin: ConfigOrigin } => {
    if (field in project && project[field] !== undefined) {
      return { value: project[field], origin: "project" };
    }
    if (field in global.values && global.values[field] !== undefined) {
      return { value: global.values[field], origin: "global" };
    }
    return { value: defaultValues[field], origin: "default" };
  };

  const name = pick("name");
  const help = pick("help");
  const colophon = pick("colophon");
  const issuesUrl = pick("issuesUrl");
  const tier = pick("tier");
  const channel = pick("channel");
  const detail = pick("detail");
  const packs = pick("packs");
  const generators = pick("generators");
  const stories = pick("stories");
  const prefixes = pick("prefixes");
  const prompts = pick("prompts");
  // `completion` is read at `setup completions` emit time (not on any fast
  // path) and carries no `config show` provenance, so it merges into the
  // effective config but is deliberately absent from ConfigOrigins.
  const completion = pick("completion");

  const config: PragmaConfig = {
    channel: (channel.value ?? defaults.channel) as Channel,
    ...(name.value !== undefined ? { name: name.value } : {}),
    ...(help.value !== undefined ? { help: help.value } : {}),
    ...(colophon.value !== undefined ? { colophon: colophon.value } : {}),
    ...(issuesUrl.value !== undefined ? { issuesUrl: issuesUrl.value } : {}),
    ...(tier.value !== undefined ? { tier: tier.value } : {}),
    ...(detail.value !== undefined ? { detail: detail.value } : {}),
    ...(packs.value !== undefined ? { packs: packs.value } : {}),
    ...(generators.value !== undefined ? { generators: generators.value } : {}),
    ...(stories.value !== undefined ? { stories: stories.value } : {}),
    ...(prefixes.value !== undefined ? { prefixes: prefixes.value } : {}),
    ...(prompts.value !== undefined ? { prompts: prompts.value } : {}),
    ...(completion.value !== undefined ? { completion: completion.value } : {}),
  };

  return {
    config,
    origins: {
      name: name.origin,
      help: help.origin,
      colophon: colophon.origin,
      issuesUrl: issuesUrl.origin,
      tier: tier.origin,
      channel: channel.origin,
      detail: detail.origin,
      packs: packs.origin,
      generators: generators.origin,
      stories: stories.origin,
      prefixes: prefixes.origin,
      prompts: prompts.origin,
    },
    global: { path: global.path, exists: global.exists },
    project: {
      ...(projectPath ? { path: projectPath } : {}),
      exists: projectPath !== undefined,
    },
  };
}
