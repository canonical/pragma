/**
 * Parse JSON-with-comments (JSONC) text into a plain object.
 *
 * Editor MCP configs (Cursor, VS Code, Windsurf) are routinely JSONC — they
 * carry `//` and block comments and trailing commas — so a strict `JSON.parse`
 * would reject a perfectly valid config. This tolerates both, then parses the
 * normalised JSON. It returns `undefined` when the text is not a JSON object
 * (genuinely malformed, or a non-object top level) so a caller can fail closed
 * rather than overwrite a config it cannot safely read; whitespace- or
 * comment-only text parses as an empty object (a config to be initialised).
 *
 * @param content - The raw config text.
 * @returns The parsed object, or `undefined` when the text is not a JSON object.
 */
export default function parseJsonc(
  content: string,
): Record<string, unknown> | undefined {
  const normalized = stripJsonc(content).trim();
  if (normalized === "") {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return undefined;
  }
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Strip comments and trailing commas from JSONC, leaving string contents (a URL
 * with `//`, an escaped quote) untouched, so the result is plain JSON.
 */
function stripJsonc(input: string): string {
  let out = "";
  let index = 0;
  let inString = false;
  while (index < input.length) {
    const char = input[index];
    if (inString) {
      out += char;
      if (char === "\\") {
        index++;
        if (index < input.length) {
          out += input[index];
        }
      } else if (char === '"') {
        inString = false;
      }
      index++;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      index++;
      continue;
    }
    if (char === "/" && input[index + 1] === "/") {
      index += 2;
      while (index < input.length && input[index] !== "\n") {
        index++;
      }
      continue;
    }
    if (char === "/" && input[index + 1] === "*") {
      const close = input.indexOf("*/", index + 2);
      if (close === -1) {
        // Unterminated block comment — malformed. Keep the rest verbatim so
        // JSON.parse rejects it (fail closed) rather than silently accepting.
        out += input.slice(index);
        break;
      }
      index = close + 2;
      continue;
    }
    if (char === "," && isTrailingComma(input, index + 1)) {
      index++;
      continue;
    }
    out += char;
    index++;
  }
  return out;
}

/**
 * Whether the next significant token after a comma — skipping whitespace and
 * comments — is a closing `}` or `]`, marking the comma as trailing.
 */
function isTrailingComma(input: string, from: number): boolean {
  let index = from;
  while (index < input.length) {
    const char = input[index];
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      index++;
      continue;
    }
    if (char === "/" && input[index + 1] === "/") {
      index += 2;
      while (index < input.length && input[index] !== "\n") {
        index++;
      }
      continue;
    }
    if (char === "/" && input[index + 1] === "*") {
      index += 2;
      while (
        index < input.length &&
        !(input[index] === "*" && input[index + 1] === "/")
      ) {
        index++;
      }
      index += 2;
      continue;
    }
    return char === "}" || char === "]";
  }
  return false;
}
