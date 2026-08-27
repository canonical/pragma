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

/**
 * The TOML basic-string escape table, both directions.
 *
 * A basic string may not carry a literal backslash, a literal quote, or a
 * control character; TOML spells each as one of these sequences. Writing only
 * the quote (and decoding only the quote) was asymmetric AND lossy: a Windows
 * path like `C:\\Users\\me\\bin` went out with bare backslashes, which TOML
 * reads back as escape sequences — so Codex saw a different string than we
 * wrote — and a correctly escaped PRE-EXISTING value did not survive a
 * read/write cycle, which breaks TOML idempotence: the read-back classifier
 * compares against what a write would emit, so a value it cannot round-trip
 * reports "updated" on every single run.
 */
const TOML_ESCAPES: Readonly<Record<string, string>> = {
  "\\": "\\\\",
  '"': '\\"',
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
};

/** The reverse table, for decoding a single-character escape sequence. */
const TOML_UNESCAPES: Readonly<Record<string, string>> = {
  "\\": "\\",
  '"': '"',
  b: "\b",
  t: "\t",
  n: "\n",
  f: "\f",
  r: "\r",
};

/**
 * Escape one character for a TOML basic string: its short escape when the
 * spec gives it one, the `\\uXXXX` form for the remaining control characters
 * (and DEL, which a basic string may not carry literally either), otherwise
 * the character itself.
 */
const escapeTomlChar = (char: string): string => {
  const shortEscape = TOML_ESCAPES[char];
  if (shortEscape !== undefined) return shortEscape;
  const code = char.charCodeAt(0);
  if (code < 0x20 || code === 0x7f) {
    return `\\u${code.toString(16).padStart(4, "0")}`;
  }
  return char;
};

/**
 * Escape a string for a TOML basic string (the body, without the quotes).
 *
 * ONE pass over the SOURCE characters, not a chain of `.replace` calls: a
 * chain has to escape the backslash strictly first, or the later steps escape
 * the backslashes it just wrote and every quote comes out doubled. That
 * ordering hazard is invisible until one value carries both characters — a
 * Windows path with an embedded quote is exactly that value. A pass that
 * never re-reads its own output cannot have the hazard at all.
 */
const escapeTomlString = (value: string): string =>
  [...value].map(escapeTomlChar).join("");

/**
 * Decode a TOML basic-string body — the exact inverse of
 * {@link escapeTomlString}, plus the `\uXXXX`/`\UXXXXXXXX` forms a
 * hand-written config may already use. An unrecognised sequence is left
 * verbatim rather than silently dropping its backslash, so a value this
 * grammar does not model survives the round trip untouched.
 */
const unescapeTomlString = (body: string): string =>
  body.replace(
    /\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g,
    (match, sequence: string) => {
      const simple = TOML_UNESCAPES[sequence];
      if (simple !== undefined) return simple;
      if (sequence[0] === "u" || sequence[0] === "U") {
        return String.fromCodePoint(Number.parseInt(sequence.slice(1), 16));
      }
      return match;
    },
  );

export const parseTomlValue = (raw: string): unknown => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return unescapeTomlString(raw.slice(1, -1));
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
  if (typeof value === "string") return `"${escapeTomlString(value)}"`;
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
