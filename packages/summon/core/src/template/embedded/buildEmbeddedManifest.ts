/**
 * The WRITER half of the embedded-template seam: walk each declared root and
 * emit the manifest the {@link import("./store.js").loadTemplateSync} reader
 * resolves against — one key scheme ({@link qualifiedKey}'s contract), both
 * halves in one package, so a host build step keeps only host duties
 * (write-when-changed, module header).
 *
 * EVERY file under a root is carried — not just `.ejs`, dotfiles included —
 * because generators also scaffold raw assets verbatim. Two fail-loud gates
 * run per root: a root with zero files throws naming the prefix and dir (a
 * missing workspace link must fail the build, not ship a manifest a run dies
 * on), and every file must survive a UTF-8 round trip (binary assets are
 * unsupported by the string manifest and must fail at build time, not corrupt
 * silently at run time).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** One declared root: the command-path prefix and the templates directory. */
export interface EmbeddedRoot {
  /** The command-path prefix keys derive under (e.g. `component`). */
  readonly prefix: string;
  /** The templates directory to walk. */
  readonly dir: string;
}

/** Recursively collect every file path under a directory (dotfiles included). */
function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Build the embedded manifest for a set of declared roots.
 *
 * @param roots - The declared roots (prefix + templates dir).
 * @returns Qualified key → content, keys sorted (deterministic output).
 * @throws When a root holds zero files, or a file is not UTF-8 text.
 */
export default function buildEmbeddedManifest(
  roots: readonly EmbeddedRoot[],
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const { prefix, dir } of roots) {
    const files = collectFiles(dir);
    if (files.length === 0) {
      throw new Error(
        `No template files under ${dir} for prefix "${prefix}" — is the workspace linked?`,
      );
    }
    for (const file of files) {
      const bytes = readFileSync(file);
      const content = bytes.toString("utf-8");
      if (!Buffer.from(content, "utf-8").equals(bytes)) {
        throw new Error(
          `Template ${file} is not valid UTF-8 text — binary assets are unsupported by the string manifest.`,
        );
      }
      const rel = relative(dir, file).split(sep).join("/");
      entries[`${prefix}/${rel}`] = content;
    }
  }

  const sorted: Record<string, string> = {};
  for (const key of Object.keys(entries).sort()) {
    sorted[key] = entries[key] as string;
  }
  return sorted;
}
