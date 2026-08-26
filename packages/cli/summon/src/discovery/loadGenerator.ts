/**
 * Load a generator definition from a file path or the in-memory cache.
 *
 * Cached entries are inserted by {@link discoverGeneratorTree} when it
 * processes barrel exports from summon-* packages.
 */

import { pathToFileURL } from "node:url";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { generatorCache } from "@canonical/summon-core";

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

  // pathToFileURL: a raw absolute path is not a valid ESM specifier on
  // Windows (the drive letter parses as a protocol).
  const module = await import(pathToFileURL(generatorPath).href);
  const generator = module.default ?? module.generator;

  if (!generator) {
    throw new Error(
      `No default export or 'generator' export found in ${generatorPath}`,
    );
  }

  return generator as GeneratorDefinition;
}
