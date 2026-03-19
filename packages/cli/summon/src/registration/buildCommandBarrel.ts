/**
 * Build a flat command list from a generator tree.
 *
 * Flattens the tree into a list of {@link CommandEntry} sorted by depth
 * so that parents are registered before children.
 *
 * @note Impure — loads generators via dynamic import.
 */

import type { GeneratorNode } from "@canonical/summon-core";
import chalk from "chalk";
import loadGenerator from "../discovery/loadGenerator.js";
import type { CommandEntry } from "./types.js";

export default async function buildCommandBarrel(
  node: GeneratorNode,
  pathSegments: string[] = [],
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
