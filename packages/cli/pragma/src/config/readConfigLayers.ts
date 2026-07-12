import { readFileSync } from "node:fs";
import findProjectConfigPath from "./findProjectConfigPath.js";
import parseConfigValues from "./parseConfigValues.js";
import resolveConfigPath from "./resolveConfigPath.js";
import resolveGlobalConfigPath from "./resolveGlobalConfigPath.js";
import type {
  ConfigFileValues,
  ConfigLayers,
  ConfigOrigin,
  PragmaConfig,
} from "./types.js";

/**
 * Resolve the layered configuration with per-field provenance.
 *
 * Layer order, least to most specific: built-in defaults, the global XDG
 * file (`~/.config/pragma/config.json`), and the nearest project
 * `pragma.config.json` up the tree. Merging is per field — a field set by
 * a more specific layer wins wholesale (`packages` replaces as a whole,
 * preserving the established project-pins-exactly semantics).
 *
 * @param cwd - Directory the project layer is resolved from.
 * @returns The effective config, per-field origins, and both layers.
 * @throws PragmaError with code `CONFIG_ERROR` when either file is invalid.
 * @note Impure — reads config files from the filesystem.
 */
export default function readConfigLayers(
  cwd: string = process.cwd(),
): ConfigLayers {
  const globalPath = resolveGlobalConfigPath();
  const projectPath = findProjectConfigPath(cwd) ?? resolveConfigPath(cwd);

  const globalFile = readConfigFile(globalPath);
  const projectFile = readConfigFile(projectPath);

  const pick = <K extends keyof ConfigFileValues>(
    field: K,
  ): { value: ConfigFileValues[K] | undefined; origin: ConfigOrigin } => {
    if (field in projectFile.values) {
      return { value: projectFile.values[field], origin: "project" };
    }
    if (field in globalFile.values) {
      return { value: globalFile.values[field], origin: "global" };
    }
    return { value: undefined, origin: "default" };
  };

  const tier = pick("tier");
  const channel = pick("channel");
  const packages = pick("packages");
  const trace = pick("trace");
  const framework = pick("framework");

  const config: PragmaConfig = {
    tier: tier.value,
    channel: channel.value ?? "normal",
    ...(packages.value ? { packages: packages.value } : {}),
    ...(trace.value !== undefined ? { trace: trace.value } : {}),
    ...(framework.value !== undefined ? { framework: framework.value } : {}),
  };

  return {
    config,
    origins: {
      tier: tier.origin,
      channel: channel.origin,
      packages: packages.origin,
      trace: trace.origin,
      framework: framework.origin,
    },
    global: { path: globalPath, exists: globalFile.exists },
    project: { path: projectPath, exists: projectFile.exists },
  };
}

/**
 * Read and parse one config file layer.
 *
 * A missing or unreadable file contributes no values — the layer simply
 * does not participate in the merge.
 */
function readConfigFile(path: string): {
  values: ConfigFileValues;
  exists: boolean;
} {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return { values: {}, exists: false };
  }
  return { values: parseConfigValues(raw, path), exists: true };
}
