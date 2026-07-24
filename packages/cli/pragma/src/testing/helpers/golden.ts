/**
 * Golden-snapshot normalizer for spawn-captured / rendered text.
 *
 * Ported from the old-shell `executor-golden.test.ts#plain()` idiom: strip ANSI
 * escapes and tokenize machine-specific paths so a snapshot compares equal in
 * CI and on a developer's machine. Apply to any stdout/stderr text before
 * `toMatchSnapshot()`.
 */

import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/** ANSI CSI escape sequences (colors, cursor movement, …). */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the literal ESC byte is the point
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

/** The package repo root (`packages/cli/pragma`), for tokenizing absolute paths. */
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url)).replace(
  /\/$/,
  "",
);

/**
 * Normalize volatile text for stable golden comparison: strips ANSI escapes,
 * then replaces the repo root, `$HOME`, and the OS temp directory with stable
 * tokens (longest/most-specific first, so a temp dir under `$HOME` still
 * tokenizes as `<tmp>` rather than a `<home>/…` prefix).
 *
 * @param text - Raw stdout/stderr/rendered text.
 * @returns The normalized text, safe to snapshot across machines.
 */
export function plain(text: string): string {
  const tmp = tmpdir().replace(/\/$/, "");
  const home = homedir().replace(/\/$/, "");

  let normalized = text.replace(ANSI_PATTERN, "");
  for (const [needle, token] of [
    [tmp, "<tmp>"],
    [REPO_ROOT, "<repo>"],
    [home, "<home>"],
  ] as const) {
    normalized = normalized.split(needle).join(token);
  }
  return normalized;
}
