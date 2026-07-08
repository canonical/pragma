/**
 * MCP config read/write/remove as Task values.
 * All effects go through @canonical/task primitives — no raw fs calls.
 * Supports both JSON and TOML config formats.
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
  type Task,
  writeFile,
} from "@canonical/task";
import parseJsonc from "./parseJsonc.js";
import {
  mergeTomlSection,
  parseTomlSection,
  removeTomlSection,
  serializeTomlSection,
} from "./toml/index.js";
import type { HarnessDefinition, McpServerConfig } from "./types.js";

/**
 * Serialize a record to formatted JSON with a trailing newline.
 */
const formatJson = (value: Record<string, unknown>): string =>
  `${JSON.stringify(value, null, 2)}\n`;

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
 * Read existing MCP server entries from a harness config file.
 *
 * @note This function is impure — it reads from the filesystem via Task effects.
 */
export const readMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
): Task<Record<string, McpServerConfig>> => {
  const configPath = harness.configPath(projectRoot);

  if (harness.configFormat === "toml") {
    return ifElseM(
      exists(configPath),
      map(readFile(configPath), (content) => {
        const sections = parseTomlSection(content, harness.mcpKey);
        return sections as unknown as Record<string, McpServerConfig>;
      }),
      pure({} as Record<string, McpServerConfig>),
    );
  }

  return ifElseM(
    exists(configPath),
    map(readFile(configPath), (content) => {
      const parsed = parseJsonc(content) ?? {};
      return (parsed[harness.mcpKey] ?? {}) as Record<string, McpServerConfig>;
    }),
    pure({} as Record<string, McpServerConfig>),
  );
};

/**
 * Write or merge an MCP server entry into a harness config file.
 * If the file exists, the new entry is merged into existing servers, preserving
 * every other server. If the file does not exist, it is created with the entry.
 * A file that is not valid JSON/JSONC fails closed rather than being overwritten.
 *
 * @note This function is impure — it reads and writes the filesystem
 * via Task effects.
 * @note A JSON merge is written back as formatted JSON, so a JSONC config's
 * comments and custom formatting are not preserved across the write — only its
 * server entries are.
 */
export const writeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
  config: McpServerConfig,
): Task<void> => {
  const configPath = harness.configPath(projectRoot);
  const undoTask = removeMcpConfig(harness, projectRoot, serverName);

  if (harness.configFormat === "toml") {
    const fields: Record<string, unknown> = { command: config.command };
    if (config.args) fields.args = config.args;
    if (config.cwd) fields.cwd = config.cwd;

    return ifElseM(
      exists(configPath),
      flatMap(readFile(configPath), (content) => {
        const merged = mergeTomlSection(
          content,
          harness.mcpKey,
          serverName,
          fields,
        );
        return writeFile(configPath, merged, { undo: undoTask });
      }),
      flatMap(mkdir(dirname(configPath), true), () =>
        writeFile(
          configPath,
          serializeTomlSection(harness.mcpKey, { [serverName]: fields }),
          { undo: undoTask },
        ),
      ),
    );
  }

  return ifElseM(
    exists(configPath),
    flatMap(readFile(configPath), (content) => {
      const parsed = parseJsonc(content);
      if (parsed === undefined) {
        return unparseableConfig(configPath);
      }
      const servers = (parsed[harness.mcpKey] ?? {}) as Record<string, unknown>;
      servers[serverName] = config;
      parsed[harness.mcpKey] = servers;
      return writeFile(configPath, formatJson(parsed), { undo: undoTask });
    }),
    flatMap(mkdir(dirname(configPath), true), () =>
      writeFile(
        configPath,
        formatJson({ [harness.mcpKey]: { [serverName]: config } }),
        { undo: undoTask },
      ),
    ),
  );
};

/**
 * Remove an MCP server entry from a harness config file.
 * If the file does not exist, this is a no-op. A file that is not valid
 * JSON/JSONC fails closed rather than being overwritten.
 *
 * @note This function is impure — it reads and writes the filesystem
 * via Task effects.
 * @note As with {@link writeMcpConfig}, a JSON rewrite does not preserve a
 * JSONC config's comments or formatting — only its server entries.
 */
export const removeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
): Task<void> => {
  const configPath = harness.configPath(projectRoot);

  if (harness.configFormat === "toml") {
    return ifElseM(
      exists(configPath),
      flatMap(readFile(configPath), (content) => {
        const removed = removeTomlSection(content, harness.mcpKey, serverName);
        return writeFile(configPath, removed);
      }),
      pure(undefined),
    );
  }

  return ifElseM(
    exists(configPath),
    flatMap(readFile(configPath), (content) => {
      const parsed = parseJsonc(content);
      if (parsed === undefined) {
        return unparseableConfig(configPath);
      }
      const servers = (parsed[harness.mcpKey] ?? {}) as Record<string, unknown>;
      delete servers[serverName];
      parsed[harness.mcpKey] = servers;
      return writeFile(configPath, formatJson(parsed));
    }),
    pure(undefined),
  );
};
