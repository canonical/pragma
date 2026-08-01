/**
 * Read a generated directory tree into a comparable value.
 *
 * The conformance suite's unit of comparison. A tree is a sorted map of
 * POSIX-style relative path → file contents, which makes "the same tree" an
 * ordinary value equality rather than a filesystem walk each caller reinvents.
 * Directory entries are not recorded: an empty directory a generator creates and
 * never fills is not part of what a consumer sees, and recording it would make
 * two conforming bins differ over a `mkdir` neither materialized.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** A generated tree: relative path → file contents, in sorted path order. */
export type TreeSnapshot = ReadonlyMap<string, string>;

/**
 * Snapshot a directory tree.
 *
 * @param dir - The root to walk. Every file below it is read as UTF-8.
 * @returns The tree as a sorted path → contents map.
 * @note Impure — reads the filesystem.
 */
export function snapshotTree(dir: string): TreeSnapshot {
  const out = new Map<string, string>();
  const walk = (current: string, base: string): void => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(current, entry.name), rel);
      else out.set(rel, readFileSync(join(current, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return out;
}
