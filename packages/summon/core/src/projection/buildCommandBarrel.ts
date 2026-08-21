/**
 * Build a flat command list from a generator tree.
 *
 * Flattens the tree into a list of {@link CommandEntry} sorted by depth so
 * that parents are registered before children. Moved from the summon bin, with
 * its two host couplings injected: the generator loader, and what to do when a
 * generator fails to load (the summon bin prints a chalk warning; a host with
 * no UI may rethrow).
 *
 * @note Impure — loads generators via the injected loader.
 */

import type { GeneratorNode } from "../discovery/types.js";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import type { CommandEntry } from "./types.js";

/** The host seams of the barrel builder. */
export interface BuildCommandBarrelOptions {
  /** Load a runnable node's generator from its index path. */
  readonly loadGenerator: (indexPath: string) => Promise<GeneratorDefinition>;
  /** Called when a generator fails to load; the entry is skipped. */
  readonly onLoadError: (name: string, error: Error) => void;
}

/**
 * Flatten a generator tree into registration-ordered command entries.
 *
 * @param node - The tree node to flatten (the discovery root, or a subtree).
 * @param options - The generator loader and load-error handler.
 * @param pathSegments - The path prefix of `node` (used when recursing).
 * @returns Entries sorted by path length (parents first).
 */
export default async function buildCommandBarrel(
  node: GeneratorNode,
  options: BuildCommandBarrelOptions,
  pathSegments: readonly string[] = [],
): Promise<CommandEntry[]> {
  const entries: CommandEntry[] = [];

  for (const [name, child] of node.children) {
    const childPath = [...pathSegments, name];

    if (child.indexPath) {
      // Runnable generator
      try {
        const generator = await options.loadGenerator(child.indexPath);
        entries.push({ path: childPath, generator });

        // If it also has children, we need to ensure parent exists and recurse
        if (child.children.size > 0) {
          const childEntries = await buildCommandBarrel(
            child,
            options,
            childPath,
          );
          entries.push(...childEntries);
        }
      } catch (err) {
        options.onLoadError(name, err as Error);
      }
    } else if (child.children.size > 0) {
      // Namespace-only (no indexPath but has children)
      // Add a placeholder entry so we create the parent command
      entries.push({
        path: childPath,
        description: `${name} generators`,
      });

      // Recurse into children
      const childEntries = await buildCommandBarrel(child, options, childPath);
      entries.push(...childEntries);
    }
  }

  // Sort by path length so parents are registered before children
  return entries.sort((a, b) => a.path.length - b.path.length);
}
