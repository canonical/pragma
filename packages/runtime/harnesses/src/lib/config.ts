/**
 * MCP config read/write/remove as Task values.
 * All effects go through @canonical/task primitives — no raw fs calls.
 * Supports both JSON and TOML config formats.
 *
 * The bodies act on a resolved {@link ConfigTarget} (the `*To`/`*From` helpers),
 * so a caller picks the band once (`resolveConfigTarget`) and the read/write
 * logic never re-consults the harness definition. The `readMcpConfig` /
 * `writeMcpConfig` / `removeMcpConfig` wrappers keep the harness-oriented
 * signature (band + platform default to the harness's own default band and the
 * live host), so existing callers are unchanged.
 */

import { dirname } from "node:path";
import {
  exists,
  failWith,
  flatMap,
  ifElseM,
  map,
  mkdir,
  pure,
  readFile,
  sequence_,
  type Task,
  writeFile,
} from "@canonical/task";
import parseJsonc from "./parseJsonc.js";
import { type PlatformEnv, readPlatformEnv } from "./platformPaths.js";
import {
  mergeTomlSection,
  parseTomlSection,
  removeTomlSection,
  serializeTomlSection,
} from "./toml/index.js";
import type {
  ConfigTarget,
  HarnessDefinition,
  McpServerConfig,
  ScopeBand,
} from "./types.js";

/**
 * Serialize a record to formatted JSON with a trailing newline.
 */
const formatJson = (value: Record<string, unknown>): string =>
  `${JSON.stringify(value, null, 2)}\n`;

/**
 * Coerce a config's server map to a plain record, defaulting a missing or
 * non-object `mcpServers` (a corrupt config where it is a string/number/array)
 * to an empty map — so a read honours its `Record` contract and a merge never
 * mutates a primitive or array.
 */
const asServerRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Fail-closed message for a config a write refuses to overwrite because it is
 * not valid JSON/JSONC — see {@link parseJsonc}.
 */
const unparseableConfig = (configPath: string): Task<void> =>
  failWith(
    "MCP_CONFIG_UNPARSEABLE",
    `Refusing to modify ${configPath}: it is not valid JSON/JSONC, so writing would overwrite it. Back it up or fix it, then retry.`,
  );

/**
 * The band a harness writes to by default: the home config for a global-only
 * harness, the project file for a `project`/`both` harness (a `both` harness
 * writes its project file unless a global band is explicitly requested).
 *
 * @param harness - The harness definition.
 * @returns Its default {@link ScopeBand}.
 */
export const defaultBandOf = (harness: HarnessDefinition): ScopeBand =>
  harness.scope === "global" ? "global" : "project";

/** Resolve a global-band harness's home config path, asserting it declares one. */
const homeConfigPathOf = (
  harness: HarnessDefinition,
  platform: PlatformEnv,
): string => {
  const build = harness.homeConfigPath;
  if (build === undefined) {
    throw new Error(
      `harness "${harness.id}" requested a global-band config target but declares no homeConfigPath`,
    );
  }
  return build(platform);
};

/**
 * Resolve a harness + band into the concrete {@link ConfigTarget} a read/write
 * acts on: the project config path for the project band, the home config path
 * (which every global/both harness declares) for the global band.
 *
 * @param harness - The harness definition.
 * @param projectRoot - The project root for the project band.
 * @param band - Which band to resolve.
 * @param platform - The captured host, for the home path.
 * @returns The resolved config target.
 */
export const resolveConfigTarget = (
  harness: HarnessDefinition,
  projectRoot: string,
  band: ScopeBand,
  platform: PlatformEnv,
): ConfigTarget => ({
  path:
    band === "global"
      ? homeConfigPathOf(harness, platform)
      : harness.configPath(projectRoot),
  configFormat: harness.configFormat,
  mcpKey: harness.mcpKey,
  scope: harness.scope,
  normalizeEnv: harness.normalizeEnv,
});

/**
 * Coerce a server config's `env` to a JSON object/map — dropping a non-object
 * `env` to `{}` — for harnesses (OpenDesign, 7g) that reject a non-map `env`.
 */
const normalizeOdEnv = (config: McpServerConfig): McpServerConfig => ({
  ...config,
  env: asServerRecord(config.env) as Record<string, string>,
});

/**
 * Read existing MCP server entries from a resolved config target.
 *
 * @param target - The resolved config location.
 * @returns The server map (empty when the file is absent/unparseable).
 * @note Impure — reads from the filesystem via Task effects.
 */
export const readMcpConfigFrom = (
  target: ConfigTarget,
): Task<Record<string, McpServerConfig>> => {
  if (target.configFormat === "toml") {
    return ifElseM(
      exists(target.path),
      map(readFile(target.path), (content) => {
        const sections = parseTomlSection(content, target.mcpKey);
        return sections as unknown as Record<string, McpServerConfig>;
      }),
      pure({} as Record<string, McpServerConfig>),
    );
  }

  return ifElseM(
    exists(target.path),
    map(readFile(target.path), (content) => {
      const parsed = parseJsonc(content) ?? {};
      return asServerRecord(parsed[target.mcpKey]) as Record<
        string,
        McpServerConfig
      >;
    }),
    pure({} as Record<string, McpServerConfig>),
  );
};

/** The TOML field record for a server config (command + optional args/cwd). */
const tomlFields = (config: McpServerConfig): Record<string, unknown> => {
  const fields: Record<string, unknown> = { command: config.command };
  if (config.args) fields.args = config.args;
  if (config.cwd) fields.cwd = config.cwd;
  return fields;
};

/**
 * Write or merge one server entry under EVERY `mcpKey` of a shared config file,
 * in a SINGLE read-modify-write. Preserves every other server and every other
 * top-level key (so two harnesses sharing a file under different keys each
 * preserve the other), and — being one write per file — never re-reads a file
 * it just created, so a dry-run of a multi-key group is well-defined. A file
 * that is not valid JSON/JSONC fails closed rather than being overwritten.
 *
 * @param path - The config file path.
 * @param configFormat - Its serialization format.
 * @param mcpKeys - The server-map keys to write the entry under (≥1).
 * @param serverName - The server entry name.
 * @param config - The server config.
 * @param undoTask - The task that reverses this write.
 * @returns A Task performing the merge/create (with an undo).
 * @note Impure — reads and writes the filesystem via Task effects.
 */
const writeServerUnderKeys = (
  path: string,
  configFormat: ConfigTarget["configFormat"],
  mcpKeys: readonly string[],
  serverName: string,
  rawConfig: McpServerConfig,
  normalizeEnv: boolean,
  undoTask: Task<void>,
): Task<void> => {
  const config = normalizeEnv ? normalizeOdEnv(rawConfig) : rawConfig;
  if (configFormat === "toml") {
    const fields = tomlFields(config);
    return ifElseM(
      exists(path),
      flatMap(readFile(path), (content) => {
        let merged = content;
        for (const key of mcpKeys) {
          merged = mergeTomlSection(merged, key, serverName, fields);
        }
        return writeFile(path, merged, { undo: undoTask });
      }),
      flatMap(mkdir(dirname(path), true), () => {
        const body = mcpKeys
          .map((key) => serializeTomlSection(key, { [serverName]: fields }))
          .join("");
        return writeFile(path, body, { undo: undoTask });
      }),
    );
  }

  return ifElseM(
    exists(path),
    flatMap(readFile(path), (content) => {
      const parsed = parseJsonc(content);
      if (parsed === undefined) {
        return unparseableConfig(path);
      }
      for (const key of mcpKeys) {
        const servers = asServerRecord(parsed[key]);
        servers[serverName] = config;
        parsed[key] = servers;
      }
      return writeFile(path, formatJson(parsed), { undo: undoTask });
    }),
    flatMap(mkdir(dirname(path), true), () => {
      const initial: Record<string, unknown> = {};
      for (const key of mcpKeys) initial[key] = { [serverName]: config };
      return writeFile(path, formatJson(initial), { undo: undoTask });
    }),
  );
};

/**
 * Write or merge an MCP server entry into a resolved config target. Preserves
 * every other server (and every other top-level key). A file that is not valid
 * JSON/JSONC fails closed rather than being overwritten.
 *
 * @param target - The resolved config location.
 * @param serverName - The server entry name to write.
 * @param config - The server config to write.
 * @returns A Task performing the merge/create (with an undo).
 * @note Impure — reads and writes the filesystem via Task effects.
 * @note A JSON merge is written back as formatted JSON, so a JSONC config's
 * comments and custom formatting are not preserved across the write — only its
 * server entries are.
 */
export const writeMcpConfigTo = (
  target: ConfigTarget,
  serverName: string,
  config: McpServerConfig,
): Task<void> =>
  writeServerUnderKeys(
    target.path,
    target.configFormat,
    [target.mcpKey],
    serverName,
    config,
    target.normalizeEnv === true,
    removeMcpConfigFrom(target, serverName),
  );

/**
 * Write one server entry across a group of targets that share ONE file under
 * (possibly) different `mcpKey`s — VS Code (`servers`) + Cline (`mcpServers`) in
 * `.vscode/mcp.json` — in a single read-modify-write, so each key preserves the
 * other and a dry-run of the group is well-defined.
 *
 * @param targets - The group's per-key targets (non-empty, sharing a file).
 * @param serverName - The server entry name to write.
 * @param config - The server config to write.
 * @returns A Task writing the entry under every target's `mcpKey`.
 * @note Impure — reads and writes the filesystem via Task effects.
 */
export const writeMcpConfigTargets = (
  targets: readonly ConfigTarget[],
  serverName: string,
  config: McpServerConfig,
): Task<void> => {
  const first = targets.at(0);
  if (first === undefined) {
    throw new Error("writeMcpConfigTargets: at least one target is required");
  }
  const undoTask = sequence_(
    targets.map((t) => removeMcpConfigFrom(t, serverName)),
  );
  return writeServerUnderKeys(
    first.path,
    first.configFormat,
    targets.map((t) => t.mcpKey),
    serverName,
    config,
    first.normalizeEnv === true,
    undoTask,
  );
};

/**
 * Remove an MCP server entry from a resolved config target. A no-op when the
 * file is absent; fails closed on an unparseable JSON/JSONC config.
 *
 * @param target - The resolved config location.
 * @param serverName - The server entry name to remove.
 * @returns A Task performing the removal.
 * @note Impure — reads and writes the filesystem via Task effects.
 */
export const removeMcpConfigFrom = (
  target: ConfigTarget,
  serverName: string,
): Task<void> => {
  if (target.configFormat === "toml") {
    return ifElseM(
      exists(target.path),
      flatMap(readFile(target.path), (content) => {
        const removed = removeTomlSection(content, target.mcpKey, serverName);
        return writeFile(target.path, removed);
      }),
      pure(undefined),
    );
  }

  return ifElseM(
    exists(target.path),
    flatMap(readFile(target.path), (content) => {
      const parsed = parseJsonc(content);
      if (parsed === undefined) {
        return unparseableConfig(target.path);
      }
      const servers = asServerRecord(parsed[target.mcpKey]);
      delete servers[serverName];
      parsed[target.mcpKey] = servers;
      return writeFile(target.path, formatJson(parsed));
    }),
    pure(undefined),
  );
};

/**
 * Read existing MCP server entries from a harness config file.
 *
 * @param harness - The harness whose config to read.
 * @param projectRoot - The project root.
 * @param band - The band to read (defaults to the harness's default band).
 * @param platform - The captured host (defaults to the live reader).
 * @returns The server map.
 * @note Impure — reads from the filesystem via Task effects.
 */
export const readMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  band: ScopeBand = defaultBandOf(harness),
  platform: PlatformEnv = readPlatformEnv(),
): Task<Record<string, McpServerConfig>> =>
  readMcpConfigFrom(resolveConfigTarget(harness, projectRoot, band, platform));

/**
 * Write or merge an MCP server entry into a harness config file.
 *
 * @param harness - The harness whose config to write.
 * @param projectRoot - The project root.
 * @param serverName - The server entry name.
 * @param config - The server config.
 * @param band - The band to write (defaults to the harness's default band).
 * @param platform - The captured host (defaults to the live reader).
 * @returns A Task performing the merge/create.
 * @note Impure — reads and writes the filesystem via Task effects.
 */
export const writeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
  config: McpServerConfig,
  band: ScopeBand = defaultBandOf(harness),
  platform: PlatformEnv = readPlatformEnv(),
): Task<void> =>
  writeMcpConfigTo(
    resolveConfigTarget(harness, projectRoot, band, platform),
    serverName,
    config,
  );

/**
 * Remove an MCP server entry from a harness config file.
 *
 * @param harness - The harness whose config to modify.
 * @param projectRoot - The project root.
 * @param serverName - The server entry name to remove.
 * @param band - The band to modify (defaults to the harness's default band).
 * @param platform - The captured host (defaults to the live reader).
 * @returns A Task performing the removal.
 * @note Impure — reads and writes the filesystem via Task effects.
 */
export const removeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
  band: ScopeBand = defaultBandOf(harness),
  platform: PlatformEnv = readPlatformEnv(),
): Task<void> =>
  removeMcpConfigFrom(
    resolveConfigTarget(harness, projectRoot, band, platform),
    serverName,
  );
