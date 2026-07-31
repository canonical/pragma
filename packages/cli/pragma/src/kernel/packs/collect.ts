/**
 * Assemble the EFFECTIVE capability modules at dispatch.
 *
 * The `--help`/`__complete` fast paths use the STATIC capabilities (the
 * authored modules plus the stories `pragma.conf.ts` declares, compiled at
 * module load) only. When a real command runs, this merges in the stories the
 * PROJECT declares: one may override a story-backed noun (replacing that
 * module) or introduce a new one; one that claims an authored, non-story noun
 * (config, ontology, …) is a hard error, and any surviving `(noun, verb)`
 * collision is caught by uniqueness.
 *
 * Precedence is config > package > static, and within config the closer
 * declaration wins: `packs[].stories` (the story a declared pack supplies) is
 * overridden by the top-level `stories` (the project's own, most specific,
 * statement). Package-shipped stories are a future source (the new kernel does
 * not yet discover package `stories/*.json`); the seam is here so wiring them
 * later is additive.
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

/**
 * The PROJECT's config-declared stories, weakest tier first.
 *
 * A tier whose origin is `"default"` is the DISTRIBUTION's own declaration,
 * which `capabilities/distribution.ts` has already compiled into the static
 * modules — that is what keeps those nouns on the `--help`/`__complete` fast
 * path. Merging it again would recompile and re-validate it on every dispatch,
 * and would put the distribution's own declarations behind a validator whose
 * failure is fatal. `readConfig`'s per-field pick replaces wholesale, so an
 * origin off `"default"` means the project (or global layer) owns that field.
 *
 * @param layers - The resolved config layers.
 * @returns The `packs[].stories` tier, then the top-level `stories` tier.
 */
function projectStoryTiers(layers: ConfigLayers): readonly unknown[][] {
  const packStories =
    layers.origins.packs === "default"
      ? []
      : (layers.config.packs ?? []).flatMap((pack) =>
          typeof pack === "string" ? [] : (pack.stories ?? []),
        );
  const topLevel =
    layers.origins.stories === "default" ? [] : (layers.config.stories ?? []);
  return [[...packStories], [...topLevel]];
}

/**
 * Merge the project's config-declared story packs into the static capabilities.
 *
 * @param staticModules - The static capabilities (authored + declared stories).
 * @param layers - The resolved config layers (its `packs`, `stories`, `prefixes`).
 * @returns The effective modules, uniqueness-checked.
 * @throws PragmaError CONFIG_ERROR on an invalid story, a story claiming an
 *   authored non-story noun, or a duplicate noun within one config tier.
 */
export function assembleEffectiveModules(
  staticModules: readonly CapabilityModule[],
  layers: ConfigLayers,
): readonly CapabilityModule[] {
  const tiers = projectStoryTiers(layers);
  if (tiers.every((tier) => tier.length === 0)) return staticModules;

  const prefixes = layers.config.prefixes ?? {};
  // Only a module compiled from a story may be replaced by one; the authored
  // nouns (config, ontology, doctor, …) are the CLI itself.
  const overridable = new Set(
    staticModules.filter((module) => module.story).map((module) => module.name),
  );
  const staticNouns = new Set(staticModules.map((module) => module.name));

  // Keyed by noun so the stronger tier REPLACES the weaker one — declaring a
  // story both on its pack and at the top level is a refinement, not an error.
  const dynamic = new Map<string, CapabilityModule>();
  for (const tier of tiers) {
    const seen = new Set<string>();
    for (const raw of tier) {
      const definition: PackDefinition = parsePackDefinition(raw, "config");
      if (seen.has(definition.noun)) {
        throw PragmaError.configError(
          `Duplicate story noun "${definition.noun}" in config.`,
        );
      }
      if (
        staticNouns.has(definition.noun) &&
        !overridable.has(definition.noun)
      ) {
        throw PragmaError.configError(
          `Story noun "${definition.noun}" collides with a built-in command.`,
        );
      }
      seen.add(definition.noun);
      dynamic.set(definition.noun, {
        name: definition.noun,
        story: true,
        verbs: compilePack(definition, "config", prefixes),
        colophon: definition.colophon,
      });
    }
  }

  // Drop the static module for any noun a config story overrides, then append
  // the dynamic modules.
  const kept = staticModules.filter((module) => !dynamic.has(module.name));
  const effective = [...kept, ...dynamic.values()];
  assertUniqueVerbs(effective.flatMap((module) => [...module.verbs]));
  return effective;
}

/**
 * Load the effective modules for a real invocation: read the layered config and
 * merge its story packs into the static capabilities.
 *
 * Reached only at DISPATCH (real command / MCP serve), never on the
 * `--help`/`__complete` fast path, so the config read and zod validation never
 * cost the storeless paths. The config reader is dynamic-imported to keep even
 * this module's static graph free of it.
 *
 * @param staticModules - The static capabilities (bundled + authored).
 * @param cwd - The directory to resolve project config against.
 * @returns The effective modules (static when no config stories are declared).
 * @note Impure — reads the project/global config.
 */
export async function loadEffectiveModules(
  staticModules: readonly CapabilityModule[],
  cwd: string,
): Promise<readonly CapabilityModule[]> {
  const { readConfig } = await import("../config/readConfig.js");
  const layers = await readConfig(cwd);
  return assembleEffectiveModules(staticModules, layers);
}
