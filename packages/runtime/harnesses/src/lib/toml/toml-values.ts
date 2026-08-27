/**
 * Internal helpers for TOML value parsing and formatting.
 * Used by the TOML section operations.
 */

export const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split a TOML inline-array body on its TOP-LEVEL commas, respecting quoted
 * strings (a comma inside `"a,b"` is data, not a separator) and nested arrays.
 * A helper for {@link parseTomlValue}'s array branch — like the rest of this
 * module it covers only the flat value grammar Codex-style MCP tables use.
 */
const splitTomlArrayItems = (body: string): string[] => {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (inString) {
      current += char;
      if (char === "\\") {
        // `slice` is empty past the end, so a (malformed) trailing backslash
        // needs no special branch.
        current += body.slice(i + 1, i + 2);
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") depth -= 1;
    else if (char === "," && depth === 0) {
      items.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0) items.push(current);
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
};

export const parseTomlValue = (raw: string): unknown => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\"/g, '"');
  }
  // Inline arrays (`["a", "b"]`) parse element-wise so a written string array
  // (e.g. Codex `args = ["mcp"]`) round-trips as an ARRAY — without this
  // branch the raw bracket text came back as a plain string, so the read-back
  // classifier could never match the entry it had just written and every
  // re-run reported "updated" (idempotence structurally broken for TOML).
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return splitTomlArrayItems(raw.slice(1, -1)).map(parseTomlValue);
  }
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
};

export const formatTomlValue = (value: unknown): string => {
  if (typeof value === "string") return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  // Arrays serialize element-wise (`["mcp"]`) — the missing branch here let an
  // array fall through to the quoted-`String(value)` fallback below, which
  // corrupted every Codex `args` to `args = "mcp"` (or `"a,b"`), a value the
  // TOML schema rejects (S1-4).
  if (Array.isArray(value)) {
    return `[${value.map(formatTomlValue).join(", ")}]`;
  }
  return `"${String(value)}"`;
};
