/**
 * Resolve every TTL graph from the semantically-configured packages.
 *
 * Reads `pragma.config.json`, merges its `packages` with the global refs
 * and the built-in defaults (a non-empty `packages` list replaces the set
 * entirely; an empty or absent list falls back to global refs merged over
 * the defaults), resolves each package through the loader chain
 * (local > git > bundled), and returns the union of their definitions/ and
 * data/ graph content — the same discovery the runtime store performs at
 * boot, minus the store.
 *
 * @note Impure — reads config and package files from disk.
 *
 * @param cwd - Working directory used to locate `pragma.config.json`.
 * @returns The TTL graph content of every resolved package.
 */

import { readConfig } from "#config";
import {
  createBundledLoader,
  createGitLoader,
  createLocalLoader,
} from "./loaders/index.js";
import { mergeAndParseRefs } from "./mergeAndParseRefs.js";
import {
  type GraphContent,
  resolveSemanticPackages,
} from "./semanticPackage.js";

export default async function resolveConfiguredGraphs(
  cwd: string,
): Promise<GraphContent[]> {
  const config = readConfig(cwd);
  const refs = mergeAndParseRefs(config.packages);
  const packages = await resolveSemanticPackages(refs, [
    createLocalLoader(),
    createGitLoader(),
    createBundledLoader(),
  ]);
  return packages.flatMap((pkg) => pkg.graphs);
}
