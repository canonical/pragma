/**
 * Expand a glob pattern against a list of known names.
 *
 * Supports:
 * - `*` anywhere: wildcard matching (`react.component.*`, `Nav*`, `*.props`)
 * - Trailing `.`: shorthand for `.*` (`react.component.` = `react.component.*`)
 *
 * Non-glob names are returned unchanged (wrapped in a single-element array)
 * so callers can pass the result directly to the lookup pipeline.
 *
 * @param pattern - User-supplied name, possibly containing glob characters.
 * @param candidates - All known names in the domain.
 * @returns Expanded concrete names, or empty array if no matches.
 */
export default function expandGlob(
  pattern: string,
  candidates: readonly string[],
): string[] {
  if (!isGlobPattern(pattern)) {
    return [pattern];
  }

  const normalized = pattern.endsWith(".") ? `${pattern}*` : pattern;
  const regex = globToRegex(normalized);

  return candidates.filter((name) => regex.test(name));
}

/**
 * Check whether a string contains glob meta-characters.
 *
 * A string is a glob pattern if it contains `*` or ends with `.` (trailing dot).
 */
export function isGlobPattern(name: string): boolean {
  if (name === "") return false;
  return name.includes("*") || name.endsWith(".");
}

function globToRegex(glob: string): RegExp {
  let pattern = "";
  for (const char of glob) {
    if (char === "*") {
      pattern += ".*";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: regex meta-characters to escape, not a JS template
    } else if (".+^${}()|[]\\".includes(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
  }
  return new RegExp(`^${pattern}$`, "i");
}
