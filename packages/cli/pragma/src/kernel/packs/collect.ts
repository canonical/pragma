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
 * statement). PACKAGE stories — the `stories/*.json` the answering pack carries
 * — are third-party data, so they go through {@link validateStories}, which
 * drops a bad one with a reported problem, CANNOT throw, and lets a package
 * ADD a noun but never replace one the CLI ships. Config stories stay fatal and
 * may override: the user owns those, and a broken `pragma.config.ts` already
 * fails every command.
 *
 * zod is reached only through {@link parsePackDefinition} (lazy) — this module
 * is imported at dispatch, never on the fast path, so validating config stories
 * costs nothing on `--help`/`__complete`.
 */

import type { ConfigLayers } from "../config/types.js";
import { PragmaError } from "../error/PragmaError.js";
import type { PackStoryRecord } from "../runtime/graphpack/stories.js";
import type { CapabilityModule } from "../spec/types.js";
import { compilePack } from "./compile.js";
import { parsePackDefinition } from "./schema.js";
import type { PackDefinition, PackEntry } from "./types.js";
import { assertUniqueVerbs } from "./uniqueness.js";

/** One package-declared story that could not be used, and why. */
export interface StoryProblem {
  /** The story file, e.g. `@acme/recipes/stories/recipe.json`. */
  readonly source: string;
  /** Why it was ignored, in one sentence. */
  readonly message: string;
}

/** The outcome of validating the stories a pack carries. */
interface ValidatedStories {
  /** The stories that can be used, one per noun. */
  readonly entries: readonly PackEntry[];
  /** The ones that were ignored, each with its reason. */
  readonly problems: readonly StoryProblem[];
}

/**
 * Turn pack-carried story records into usable entries, DROPPING (never throwing
 * on) the ones that cannot be used.
 *
 * TOTAL by construction: `JSON.parse` and `parsePackDefinition` happen inside
 * ONE try per record, so a malformed file and a schema-invalid one are handled
 * identically. That is not a nicety — package stories reach dispatch before the
 * command tree exists, so a throw here would fail EVERY command, including
 * `sources update` and `doctor`, the only two that can recover from it.
 *
 * Two packages claiming one noun: the last declared wins and the shadowed one
 * is reported, through this same channel.
 *
 * A package story may only introduce a NOUN THE CLI DOES NOT HAVE. Every static
 * noun is reserved — not just the authored ones: `block`, `token` and `tier` are
 * COMPOSITES whose module carries a hand-written verb alongside its story
 * (`block list`, `token add-config`, `tier lookup`), and the merge replaces a
 * noun wholesale, so letting a package claim one would silently delete a
 * mutation and a covenant-frozen verb from a user who only declared a
 * dependency. Overriding a shipped noun stays a CONFIG decision — that file is
 * the user's own.
 *
 * @param records - The raw story records the answering pack carries.
 * @param staticModules - The static capabilities, to detect a story claiming a
 *   noun the CLI already ships.
 * @returns The usable entries and the problems, both possibly empty.
 */
export function validateStories(
  records: readonly PackStoryRecord[],
  staticModules: readonly CapabilityModule[],
): ValidatedStories {
  const reserved = new Set(staticModules.map((module) => module.name));
  const byNoun = new Map<string, PackEntry>();
  const problems: StoryProblem[] = [];
  for (const record of records) {
    try {
      const definition = parsePackDefinition(
        JSON.parse(record.content),
        record.source,
      );
      if (reserved.has(definition.noun)) {
        problems.push({
          source: record.source,
          message: `its noun "${definition.noun}" is a command this CLI already ships and cannot be replaced by a package.`,
        });
        continue;
      }
      const shadowed = byNoun.get(definition.noun);
      if (shadowed) {
        problems.push({
          source: shadowed.source,
          message: `its "${definition.noun}" story is shadowed by ${record.source}.`,
        });
      }
      byNoun.set(definition.noun, { source: record.source, definition });
    } catch (error) {
      problems.push({
        source: record.source,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { entries: [...byNoun.values()], problems };
}

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
 * Merge the package- and config-declared story packs into the static capabilities.
 *
 * @param staticModules - The static capabilities (authored + declared stories).
 * @param layers - The resolved config layers (its `packs`, `stories`, `prefixes`).
 * @param packageStories - The already-validated stories the answering pack
 *   carries (see {@link validateStories}); weaker than either config tier.
 * @returns The effective modules, uniqueness-checked.
 * @throws PragmaError CONFIG_ERROR on an invalid CONFIG story, a config story
 *   claiming an authored non-story noun, or a duplicate noun within one config
 *   tier. Package stories were already screened and never throw here.
 */
export function assembleEffectiveModules(
  staticModules: readonly CapabilityModule[],
  layers: ConfigLayers,
  packageStories: readonly PackEntry[] = [],
): readonly CapabilityModule[] {
  const tiers = projectStoryTiers(layers);
  if (packageStories.length === 0 && tiers.every((tier) => tier.length === 0)) {
    return staticModules;
  }

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
  for (const entry of packageStories) {
    dynamic.set(entry.definition.noun, {
      name: entry.definition.noun,
      story: true,
      verbs: compilePack(
        entry.definition,
        { label: entry.source, origin: "package" },
        prefixes,
      ),
      colophon: entry.definition.colophon,
    });
  }
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
        verbs: compilePack(
          definition,
          { label: "config", origin: "config" },
          prefixes,
        ),
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
 * the answering pack's carried stories, and merge both into the static
 * capabilities.
 *
 * Reached only at DISPATCH (real command / MCP serve), never on the
 * `--help`/`__complete` fast path, so the config read, the pack read and zod
 * validation never cost the storeless paths. The runtime pieces are
 * dynamic-imported to keep even this module's static graph free of them.
 *
 * @param staticModules - The static capabilities (authored + declared stories).
 * @param cwd - The directory to resolve project config against.
 * @returns The effective modules, plus the package stories that were ignored —
 *   callers surface those on stderr rather than failing the command.
 * @note Impure — reads the project/global config and the answering pack.
 */
export async function loadEffectiveModules(
  staticModules: readonly CapabilityModule[],
  cwd: string,
): Promise<{
  readonly modules: readonly CapabilityModule[];
  readonly problems: readonly StoryProblem[];
}> {
  const [{ readConfig }, { resolveSources }, { activeStories }] =
    await Promise.all([
      import("../config/readConfig.js"),
      import("../runtime/resolveSources.js"),
      import("../runtime/graphpack/stories.js"),
    ]);
  const layers = await readConfig(cwd);
  const { entries, problems } = validateStories(
    activeStories(resolveSources(layers, cwd)),
    staticModules,
  );
  return {
    modules: assembleEffectiveModules(staticModules, layers, entries),
    problems,
  };
}
