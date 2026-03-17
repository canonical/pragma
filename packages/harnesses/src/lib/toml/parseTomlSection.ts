/**
 * Parse a TOML string and extract entries under a given section prefix.
 * For example, parseTomlSection(content, "mcp_servers") returns a record
 * of server names to their key-value pairs.
 *
 * This is NOT a general-purpose TOML parser — it only supports the flat
 * [prefix.name] table format used by Codex MCP config.
 */

import { escapeRegex, parseTomlValue } from "./toml-values.js";

export default function parseTomlSection(
  content: string,
  sectionPrefix: string,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  const tablePattern = new RegExp(
    `^\\[${escapeRegex(sectionPrefix)}\\.([^\\]]+)\\]`,
  );

  let currentName: string | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const tableMatch = line.match(tablePattern);
    if (tableMatch) {
      currentName = tableMatch[1];
      result[currentName] = {};
      continue;
    }

    if (line.startsWith("[")) {
      currentName = null;
      continue;
    }

    if (currentName && line.includes("=")) {
      const eqIndex = line.indexOf("=");
      const key = line.slice(0, eqIndex).trim();
      const rawValue = line.slice(eqIndex + 1).trim();
      result[currentName][key] = parseTomlValue(rawValue);
    }
  }

  return result;
}
