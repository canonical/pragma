/**
 * The WRITER half of the embedded-template seam: walk each declared root and
 * emit the manifest the {@link import("./store.js").loadTemplateSync} reader
 * resolves against. Every key is derived THROUGH {@link qualifiedKey} — the
 * reader's own function — so whatever the writer embeds, the reader can
 * address by construction; both halves live in one package, and a host build
 * step keeps only host duties (write-when-changed, module header).
 *
 * EVERY file under a root is carried — not just `.ejs`, dotfiles included —
 * because generators also scaffold raw assets verbatim. Four fail-loud gates
 * guard the build: a root with zero files throws naming the prefix and dir (a
 * missing workspace link must fail the build, not ship a manifest a run dies
 * on); every file must survive a UTF-8 round trip (binary assets are
 * unsupported by the string manifest and must fail at build time, not corrupt
 * silently at run time); a file the reader could never key (no `templates/`
 * segment in its path) throws naming the file; and two files folding onto one
 * key (nested `templates/` directories) throw rather than silently shadowing
 * each other.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import qualifiedKey from "./keyScheme.js";

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
 * @throws When a root holds zero files, a file is not UTF-8 text, a file's
 *   path carries no `templates/` segment (un-keyable by the reader), or two
 *   files derive the same key.
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
      // THE key derivation — qualifiedKey, the reader's function, so a key
      // the reader cannot re-derive can never be written.
      const key = qualifiedKey(prefix, file.split(sep).join("/"));
      if (key === undefined) {
        throw new Error(
          `Template ${file} has no "templates/" segment in its path — the reader (qualifiedKey) could never address it, so embedding it would strand it.`,
        );
      }
      if (entries[key] !== undefined) {
        throw new Error(
          `Embedded-template key collision: ${file} derives "${key}", which is already taken — a nested "templates/" directory folds onto the key of the outer tree; rename one of them.`,
        );
      }
      entries[key] = content;
    }
  }

  const sorted: Record<string, string> = {};
  for (const key of Object.keys(entries).sort()) {
    sorted[key] = entries[key] as string;
  }
  return sorted;
}
