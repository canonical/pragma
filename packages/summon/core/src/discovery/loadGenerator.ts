/**
 * Load a generator definition from a file path or the in-memory cache.
 *
 * Cached entries are inserted by {@link discoverGeneratorTree} when it
 * processes barrel exports from summon-* packages.
 */

import type { GeneratorDefinition } from "../types.js";

/**
 * Generator cache — stores generators loaded from package barrels.
 * Key is the command path (e.g., "component/react").
 */
export const generatorCache = new Map<string, GeneratorDefinition>();

/**
 * Load a generator from a path or the cache.
 *
 * @note Impure — performs dynamic import when the generator is not cached.
 */
export default async function loadGenerator(
  generatorPath: string,
): Promise<GeneratorDefinition> {
  // Check if this is a cached generator from a package barrel
  if (generatorPath.startsWith("cache:")) {
    const cacheKey = generatorPath.slice(6);
    const cached = generatorCache.get(cacheKey);
    if (cached) return cached;
    throw new Error(`Generator not found in cache: ${cacheKey}`);
  }

  const module = await import(generatorPath);
  const generator = module.default ?? module.generator;

  if (!generator) {
    throw new Error(
      `No default export or 'generator' export found in ${generatorPath}`,
    );
  }

  return generator as GeneratorDefinition;
}
