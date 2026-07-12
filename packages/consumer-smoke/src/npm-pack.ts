/**
 * Parsing helpers for `npm pack --json` output.
 *
 * npm writes the JSON result to stdout; warnings and notices go to stderr,
 * and lifecycle scripts (prepack/prepare) may print arbitrary text on either
 * stream. So: parse stdout ONLY (never a merged stdout+stderr string), and
 * extract the balanced JSON array instead of slicing from the first `[` to
 * end-of-string, so surrounding noise can never corrupt the parse.
 */

/** The two streams of a finished `npm pack --json` invocation. */
export interface PackOutput {
  stdout: string;
  stderr: string;
}

/**
 * Return the balanced JSON array starting exactly at `text[start]`
 * (which must be `[`), or null when the array never closes.
 * String-literal aware: `[` / `]` inside JSON strings don't count.
 */
function extractBalancedArray(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse the JSON array from `npm pack --json` output. Reads stdout only;
 * tolerates notices/lifecycle noise before and after the array by trying
 * each `[` until one yields a balanced, parseable JSON array.
 */
export function parsePackJson(
  pack: PackOutput,
): Array<{ filename?: unknown } & Record<string, unknown>> {
  const text = pack.stdout;
  let from = 0;
  for (;;) {
    const start = text.indexOf("[", from);
    if (start === -1) break;
    const candidate = extractBalancedArray(text, start);
    if (candidate !== null) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON (e.g. a lifecycle script printed "[build] done") — keep looking.
      }
    }
    from = start + 1;
  }
  throw new Error("no JSON array found on npm pack stdout");
}

/** The tarball filename reported by `npm pack --json`. Throws when absent. */
export function packFilename(pack: PackOutput): string {
  const filename = parsePackJson(pack)[0]?.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("npm pack --json returned no filename");
  }
  return filename;
}
