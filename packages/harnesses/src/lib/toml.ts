/**
 * Minimal TOML parser/serializer for MCP server config tables.
 *
 * Handles the flat [mcp_servers.<name>] table format used by Codex.
 * This is NOT a general-purpose TOML library — it only supports the
 * subset needed for MCP server entries.
 */

/**
 * Parse a TOML string and extract entries under a given section prefix.
 * For example, parseTomlSection(content, "mcp_servers") returns a record
 * of server names to their key-value pairs.
 */
export const parseTomlSection = (
  content: string,
  sectionPrefix: string,
): Record<string, Record<string, unknown>> => {
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
};

/**
 * Serialize a record of entries into TOML table format under a section prefix.
 */
export const serializeTomlSection = (
  sectionPrefix: string,
  entries: Record<string, Record<string, unknown>>,
): string => {
  const lines: string[] = [];

  for (const [name, fields] of Object.entries(entries)) {
    lines.push(`[${sectionPrefix}.${name}]`);
    for (const [key, value] of Object.entries(fields)) {
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

/**
 * Merge a TOML section into existing TOML content.
 * Replaces the named table if it exists, appends if it doesn't.
 */
export const mergeTomlSection = (
  content: string,
  sectionPrefix: string,
  name: string,
  fields: Record<string, unknown>,
): string => {
  const removed = removeTomlSection(content, sectionPrefix, name);
  const newSection = serializeTomlSection(sectionPrefix, { [name]: fields });
  const trimmed = removed.trimEnd();
  return trimmed ? `${trimmed}\n\n${newSection}` : newSection;
};

/**
 * Remove a named table from TOML content.
 */
export const removeTomlSection = (
  content: string,
  sectionPrefix: string,
  name: string,
): string => {
  const header = `[${sectionPrefix}.${name}]`;
  const lines = content.split("\n");
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === header) {
      skipping = true;
      continue;
    }

    if (skipping && trimmed.startsWith("[")) {
      skipping = false;
    }

    if (!skipping) {
      result.push(line);
    }
  }

  return result.join("\n");
};

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseTomlValue = (raw: string): unknown => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\"/g, '"');
  }
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
};

const formatTomlValue = (value: unknown): string => {
  if (typeof value === "string") return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `"${String(value)}"`;
};
