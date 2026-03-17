/**
 * MCP config read/write/remove as Task values.
 * All effects go through @canonical/task primitives — no raw fs calls.
 */

import { dirname } from "node:path";
import {
  exists,
  flatMap,
  ifElseM,
  map,
  mkdir,
  pure,
  readFile,
  type Task,
  writeFile,
} from "@canonical/task";
import type { HarnessDefinition, McpServerConfig } from "./types.js";

/**
 * Assert that the harness uses a JSON-based config format.
 * TOML-based harnesses (e.g. Codex) are not yet supported for config operations.
 */
const assertJsonFormat = (harness: HarnessDefinition): void => {
  if (harness.configFormat === "toml") {
    throw new Error(
      `Config read/write for TOML-based harness "${harness.name}" is not yet supported`,
    );
  }
};

/**
 * Parse a JSON string into a record, returning an empty object on failure.
 */
const parseJsonSafe = (content: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

/**
 * Serialize a record to formatted JSON with a trailing newline.
 */
const formatJson = (value: Record<string, unknown>): string =>
  `${JSON.stringify(value, null, 2)}\n`;

/**
 * Read existing MCP server entries from a harness config file.
 *
 * @note This function is impure — it reads from the filesystem via Task effects.
 */
export const readMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
): Task<Record<string, McpServerConfig>> => {
  assertJsonFormat(harness);
  const configPath = harness.configPath(projectRoot);

  return ifElseM(
    exists(configPath),
    map(readFile(configPath), (content) => {
      const parsed = parseJsonSafe(content);
      return (parsed[harness.mcpKey] ?? {}) as Record<string, McpServerConfig>;
    }),
    pure({} as Record<string, McpServerConfig>),
  );
};

/**
 * Write or merge an MCP server entry into a harness config file.
 * If the file exists, the new entry is merged into existing servers.
 * If the file does not exist, it is created with the entry.
 *
 * @note This function is impure — it reads and writes the filesystem
 * via Task effects.
 */
export const writeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
  config: McpServerConfig,
): Task<void> => {
  assertJsonFormat(harness);
  const configPath = harness.configPath(projectRoot);

  return ifElseM(
    exists(configPath),
    flatMap(readFile(configPath), (content) => {
      const parsed = parseJsonSafe(content);
      const servers = (parsed[harness.mcpKey] ?? {}) as Record<string, unknown>;
      servers[serverName] = config;
      parsed[harness.mcpKey] = servers;
      return writeFile(configPath, formatJson(parsed));
    }),
    flatMap(mkdir(dirname(configPath), true), () =>
      writeFile(
        configPath,
        formatJson({ [harness.mcpKey]: { [serverName]: config } }),
      ),
    ),
  );
};

/**
 * Remove an MCP server entry from a harness config file.
 * If the file does not exist, this is a no-op.
 *
 * @note This function is impure — it reads and writes the filesystem
 * via Task effects.
 */
export const removeMcpConfig = (
  harness: HarnessDefinition,
  projectRoot: string,
  serverName: string,
): Task<void> => {
  assertJsonFormat(harness);
  const configPath = harness.configPath(projectRoot);

  return ifElseM(
    exists(configPath),
    flatMap(readFile(configPath), (content) => {
      const parsed = parseJsonSafe(content);
      const servers = (parsed[harness.mcpKey] ?? {}) as Record<string, unknown>;
      delete servers[serverName];
      parsed[harness.mcpKey] = servers;
      return writeFile(configPath, formatJson(parsed));
    }),
    pure(undefined),
  );
};
