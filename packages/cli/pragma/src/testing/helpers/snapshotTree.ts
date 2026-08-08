/**
 * The scaffold-tree reader the create byte-equality guards share.
 *
 * ONE COPY, and that is the point: four guards compare two scaffolds for
 * byte-equality — source run vs compiled binary, pragma bin vs summon-core, and
 * the fork binary's own tree — and each carried its own transcription of this
 * walk. Three were byte-identical; the fourth had lost the `sort`. A change to
 * the walk (order, encoding, symlink handling) has to reach all of them at once
 * or those comparisons stop meaning the same thing, which is a silent weakening
 * of guards whose whole job is byte-for-byte identity.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read a directory tree into a sorted map of relative path → contents.
 *
 * @param dir - The root to read.
 * @returns Relative path → file contents.
 * @note Impure — reads the filesystem.
 */
export function snapshotTree(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (at: string, base: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(at, entry.name), rel);
      else out.set(rel, readFileSync(join(at, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return out;
}
