import type { PragmaConfig } from "#config";
import { PragmaError } from "#error";
import type { SemanticPackage } from "../../semanticPackage.js";
import { BUNDLED_PACKS } from "./bundled/index.js";
import { isReserved, type ReservedVerbs } from "./reservedVerbs.js";
import type { StoryPackDefinition } from "./types.js";
import validateStoryPackDefinition from "./validateStoryPackDefinition.js";

/** A validated story definition paired with where it was declared. */
export interface PackStoryEntry {
  readonly definition: StoryPackDefinition;
  readonly source: string;
}

/**
 * The verbs a pack definition compiles to — mirrors `compilePackStories`,
 * which always emits `list` and adds `lookup` only when declared.
 */
function emittedVerbs(definition: StoryPackDefinition): string[] {
  return ["list", ...(definition.lookup ? ["lookup"] : [])];
}

/**
 * Name the built-in `(noun, verb)` command(s) a pack collides with, for
 * actionable diagnostics — e.g. `built-in command "standard lookup"`.
 * Since the guard is per-verb, reporting the noun alone is misleading.
 */
function describeShadow(noun: string, verbs: readonly string[]): string {
  const pairs = verbs.map((verb) => `"${noun} ${verb}"`).join(", ");
  return `built-in command${verbs.length > 1 ? "s" : ""} ${pairs}`;
}

/**
 * Gather the story-pack definitions active for a runtime.
 *
 * Config-declared stories come first (already validated by the config
 * parser) and win noun collisions against package-shipped ones — the
 * config is the user's override layer. Package story files are validated
 * here; an invalid or colliding package story is skipped with a warning
 * so one bad file cannot break boot. A config story colliding with a
 * reserved (built-in) noun is a hard config error. Bundled transitional
 * packs come last (lowest precedence), so config or a package can override
 * a bundled noun.
 *
 * @param config - The effective merged configuration.
 * @param packages - Resolved semantic packages (may ship `stories/*.json`).
 * @param reserved - Built-in `(noun, verb)` reservations packs must not
 *   shadow; a pack collides only when it emits a reserved verb.
 * @param bundled - Transitional packs pragma ships by default (lowest
 *   precedence). Defaults to {@link BUNDLED_PACKS}; tests pass `[]` to isolate.
 * @returns Validated, collision-free story entries.
 * @throws PragmaError with code `CONFIG_ERROR` when a config story shadows
 *   a reserved built-in verb.
 * @note Impure — warns on stderr for skipped package stories.
 */
export default function collectPackStories(
  config: PragmaConfig,
  packages: readonly SemanticPackage[],
  reserved: ReservedVerbs,
  bundled: readonly StoryPackDefinition[] = BUNDLED_PACKS,
): PackStoryEntry[] {
  const entries: PackStoryEntry[] = [];
  const taken = new Set<string>();

  for (const definition of config.stories ?? []) {
    const shadowed = emittedVerbs(definition).filter((verb) =>
      isReserved(reserved, definition.noun, verb),
    );
    if (shadowed.length > 0) {
      throw PragmaError.configError(
        `Story noun "${definition.noun}" shadows ${describeShadow(
          definition.noun,
          shadowed,
        )}.`,
      );
    }
    if (taken.has(definition.noun)) {
      throw PragmaError.configError(
        `Duplicate story noun "${definition.noun}" in config.`,
      );
    }
    taken.add(definition.noun);
    entries.push({ definition, source: "config" });
  }

  for (const pkg of packages) {
    for (const file of pkg.stories) {
      let definition: StoryPackDefinition;
      try {
        definition = validateStoryPackDefinition(file.definition, file.path);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Warning: skipping story — ${reason}\n`);
        continue;
      }
      const shadowed = emittedVerbs(definition).filter((verb) =>
        isReserved(reserved, definition.noun, verb),
      );
      if (shadowed.length > 0) {
        process.stderr.write(
          `Warning: skipping story "${definition.noun}" from ${file.path} — it shadows ${describeShadow(
            definition.noun,
            shadowed,
          )}.\n`,
        );
        continue;
      }
      if (taken.has(definition.noun)) {
        process.stderr.write(
          `Warning: skipping story "${definition.noun}" from ${file.path} — the noun is already provided by a higher-precedence source.\n`,
        );
        continue;
      }
      taken.add(definition.noun);
      entries.push({ definition, source: file.path });
    }
  }

  // Bundled transitional packs — lowest precedence, so a config- or
  // package-declared story for the same noun overrides them (the P4 handoff).
  // Authored in-repo but still validated: only a validation failure (an
  // authoring slip) is skipped with a warning (consistent with package
  // stories — one bad pack cannot break boot), and the pack's own parity tests
  // catch a bundled pack that fails to load. When a still-reserved built-in or
  // a higher-precedence source already owns the noun, the bundled pack yields
  // silently (no warning) — the shadow/duplicate check below, matching the
  // precedence order rather than flagging an error.
  for (const raw of bundled) {
    const source = `bundled:${raw.noun}`;
    let definition: StoryPackDefinition;
    try {
      definition = validateStoryPackDefinition(raw, source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Warning: skipping bundled story — ${reason}\n`);
      continue;
    }
    const shadowed = emittedVerbs(definition).filter((verb) =>
      isReserved(reserved, definition.noun, verb),
    );
    if (shadowed.length > 0 || taken.has(definition.noun)) {
      // A still-registered built-in (not yet cut over) or a higher-precedence
      // source already owns this noun — the bundled pack yields to it silently.
      continue;
    }
    taken.add(definition.noun);
    entries.push({ definition, source });
  }

  return entries;
}
