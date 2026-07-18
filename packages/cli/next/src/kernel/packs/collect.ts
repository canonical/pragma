/**
 * Assemble the EFFECTIVE capability modules at dispatch.
 *
 * The `--help`/`__complete` fast paths use the STATIC capabilities (bundled +
 * authored) only. When a real command runs and the project config declares
 * `stories`, this merges them in: a config story overrides a bundled-pack noun
 * (replacing that module) or introduces a new noun; a config story that claims a
 * non-pack authored noun (config, ontology, …) is a hard error, and any
 * surviving `(noun, verb)` collision is caught by uniqueness.
 *
 * Precedence is config > package > bundled. Package-shipped stories are a future
 * source (the new kernel does not yet discover package `stories/*.json`); the
 * seam is here so wiring them later is additive.
 *
 * zod is reached only through {@link parsePackDefinition} (lazy) — this module
 * is imported at dispatch, never on the fast path, so validating config stories
 * costs nothing on `--help`/`__complete`.
 */

import type { ConfigLayers } from "../config/types.js";
import { PragmaError } from "../error/PragmaError.js";
import type { CapabilityModule } from "../spec/types.js";
import { compilePack } from "./compile.js";
import { parsePackDefinition } from "./schema.js";
import type { PackDefinition } from "./types.js";
import { assertUniqueVerbs } from "./uniqueness.js";

/** The bundled-pack nouns a config/package story may override. */
export const BUNDLED_PACK_NOUNS: readonly string[] = [
  "standard",
  "tier",
  "modifier",
  "token",
  "block",
];

/**
 * Merge dynamic (config-declared) story packs into the static capabilities.
 *
 * @param staticModules - The static capabilities (bundled + authored).
 * @param layers - The resolved config layers (its `config.stories`, `prefixes`).
 * @returns The effective modules, uniqueness-checked.
 * @throws PragmaError CONFIG_ERROR on an invalid story, a story claiming a
 *   non-pack authored noun, or a duplicate story noun.
 */
export function assembleEffectiveModules(
  staticModules: readonly CapabilityModule[],
  layers: ConfigLayers,
): readonly CapabilityModule[] {
  const stories = layers.config.stories ?? [];
  if (stories.length === 0) return staticModules;

  const prefixes = layers.config.prefixes ?? {};
  const overridable = new Set(BUNDLED_PACK_NOUNS);
  const staticNouns = new Set(staticModules.map((module) => module.name));

  const seen = new Set<string>();
  const dynamic: CapabilityModule[] = [];
  for (const raw of stories) {
    const definition: PackDefinition = parsePackDefinition(raw, "config");
    if (seen.has(definition.noun)) {
      throw PragmaError.configError(
        `Duplicate story noun "${definition.noun}" in config.`,
      );
    }
    if (staticNouns.has(definition.noun) && !overridable.has(definition.noun)) {
      throw PragmaError.configError(
        `Story noun "${definition.noun}" collides with a built-in command.`,
      );
    }
    seen.add(definition.noun);
    dynamic.push({
      name: definition.noun,
      verbs: compilePack(definition, "config", prefixes),
    });
  }

  // Drop the bundled module for any noun a config story overrides, then append
  // the dynamic modules.
  const kept = staticModules.filter((module) => !seen.has(module.name));
  const effective = [...kept, ...dynamic];
  assertUniqueVerbs(effective.flatMap((module) => [...module.verbs]));
  return effective;
}
