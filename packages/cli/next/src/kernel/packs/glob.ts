/**
 * Glob expansion for pack lookups (`react/component/*`, `Nav*`, trailing `.`).
 *
 * Ported from the v1 suggester. A glob expands against the pack's known entity
 * names; a non-glob passes through unchanged so callers can pipe the result
 * straight into the lookup batch.
 */

/** Whether a string contains glob meta-characters (`*` or a trailing `.`). */
export function isGlobPattern(name: string): boolean {
  if (name === "") return false;
  return name.includes("*") || name.endsWith(".");
}

/** Expand a glob against candidate names; a non-glob returns `[pattern]`. */
export function expandGlob(
  pattern: string,
  candidates: readonly string[],
): string[] {
  if (!isGlobPattern(pattern)) return [pattern];
  const normalized = pattern.endsWith(".") ? `${pattern}*` : pattern;
  const regex = globToRegex(normalized);
  return candidates.filter((name) => regex.test(name));
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
