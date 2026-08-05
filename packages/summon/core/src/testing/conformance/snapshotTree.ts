/**
 * Reading a produced tree, and comparing it to the expected one byte for byte.
 *
 * Deliberately free of any test framework: this module ships in `dist`, and a
 * consumer's runner is its own business. A mismatch THROWS with the offending
 * path named, which every runner reports the same way.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read a directory tree into a map of relative path → contents.
 *
 * Entries are walked in name order so the map's iteration order is stable
 * across filesystems — a comparison that depended on readdir order would pass
 * or fail by accident depending on the machine.
 *
 * @param dir - The directory to read.
 * @returns Relative POSIX-style path → file contents, decoded as UTF-8.
 * @note Impure — reads the filesystem.
 */
export function snapshotTree(dir: string): Map<string, string> {
  const tree = new Map<string, string>();
  const walk = (current: string, base: string): void => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const relative = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(current, entry.name), relative);
      else tree.set(relative, readFileSync(join(current, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return tree;
}

/**
 * Assert a produced tree is byte-identical to the expected one.
 *
 * The empty-reference guard is not decoration: a reference that degenerated to
 * nothing would agree with a producer that also wrote nothing, and the suite
 * would go green while the seam was dead.
 *
 * @param produced - The tree a binary's execution seam wrote.
 * @param expected - The written-down reference (see `CONFORMANCE_TREE`).
 * @throws Error naming the path-set mismatch, or the first path whose bytes
 *   differ, with both sides quoted.
 */
export function assertByteEqual(
  produced: ReadonlyMap<string, string>,
  expected: ReadonlyMap<string, string>,
): void {
  if (expected.size === 0) {
    throw new Error("conformance: the expected tree is EMPTY");
  }
  const producedPaths = [...produced.keys()].sort();
  const expectedPaths = [...expected.keys()].sort();
  if (producedPaths.join("\n") !== expectedPaths.join("\n")) {
    throw new Error(
      `conformance: produced ${describePaths(producedPaths)}, expected ${describePaths(expectedPaths)}`,
    );
  }
  for (const path of expectedPaths) {
    const left = produced.get(path);
    const right = expected.get(path);
    if (left !== right) {
      throw new Error(
        `conformance: ${path} differs\n--- produced ---\n${left}\n--- expected ---\n${right}`,
      );
    }
  }
}

/** Render a path list for an assertion message. */
function describePaths(paths: readonly string[]): string {
  return paths.length === 0 ? "EMPTY" : `[${paths.join(", ")}]`;
}
