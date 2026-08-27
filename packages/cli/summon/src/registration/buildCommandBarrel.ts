/**
 * Build a flat command list from a generator tree — summon's own barrel
 * builder, this bin's ONE consumer of tree-walking barrel construction
 * (pragma builds its barrel from its generated surface data). Flattens the
 * tree into a list of {@link CommandEntry} sorted by depth so that parents
 * are registered before children; a generator that fails to load gets a
 * chalk warning and is skipped, the rest still register.
 *
 * @note Impure — loads generators via dynamic import, warns on stderr.
 */

import type { GeneratorNode } from "@canonical/summon-core";
import type { CommandEntry } from "@canonical/summon-core/projection";
import chalk from "chalk";
import { loadGenerator } from "../discovery/index.js";

/**
 * Flatten a generator tree into registration-ordered command entries.
 *
 * @param node - The tree node to flatten (the discovery root, or a subtree).
 * @param pathSegments - The path prefix of `node` (used when recursing).
 * @returns Entries sorted by path length (parents first).
 */
export default async function buildCommandBarrel(
  node: GeneratorNode,
  pathSegments: readonly string[] = [],
): Promise<CommandEntry[]> {
  const entries: CommandEntry[] = [];

  for (const [name, child] of node.children) {
    const childPath = [...pathSegments, name];

    if (child.indexPath) {
      // Runnable generator
      try {
        const generator = await loadGenerator(child.indexPath);
        entries.push({ path: childPath, generator });

        // If it also has children, we need to ensure parent exists and recurse
        if (child.children.size > 0) {
          const childEntries = await buildCommandBarrel(child, childPath);
          entries.push(...childEntries);
        }
      } catch (err) {
        console.error(
          chalk.yellow(`Warning: Could not load generator '${name}':`),
          (err as Error).message,
        );
      }
    } else if (child.children.size > 0) {
      // Namespace-only (no indexPath but has children)
      // Add a placeholder entry so we create the parent command
      entries.push({
        path: childPath,
        description: `${name} generators`,
      });

      // Recurse into children
      const childEntries = await buildCommandBarrel(child, childPath);
      entries.push(...childEntries);
    }
  }

  // Sort by path length so parents are registered before children
  return entries.sort((a, b) => a.path.length - b.path.length);
}
