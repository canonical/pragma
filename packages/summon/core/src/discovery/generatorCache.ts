/**
 * Shared generator cache — stores generators loaded from package barrels.
 *
 * Extracted into its own module so both {@link discoverGeneratorTree}
 * (library) and `loadGenerator` (binary) can access the same Map instance
 * without coupling library code to binary-only modules.
 */

import type { GeneratorDefinition } from "../types.js";

/**
 * Key is the command path (e.g., "component/react").
 * Populated by {@link discoverGeneratorTree} when processing package barrels.
 * Read by `loadGenerator` when resolving `cache:` prefixed paths.
 */
export const generatorCache = new Map<string, GeneratorDefinition>();
