import type { PragmaConfig } from "#config";
import { PragmaError } from "#error";
import type { SemanticPackage } from "../../semanticPackage.js";
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
 * Gather the story-pack definitions active for a runtime.
 *
 * Config-declared stories come first (already validated by the config
 * parser) and win noun collisions against package-shipped ones — the
 * config is the user's override layer. Package story files are validated
 * here; an invalid or colliding package story is skipped with a warning
 * so one bad file cannot break boot. A config story colliding with a
 * reserved (built-in) noun is a hard config error.
 *
 * @param config - The effective merged configuration.
 * @param packages - Resolved semantic packages (may ship `stories/*.json`).
 * @param reserved - Built-in `(noun, verb)` reservations packs must not
 *   shadow; a pack collides only when it emits a reserved verb.
 * @returns Validated, collision-free story entries.
 * @throws PragmaError with code `CONFIG_ERROR` when a config story shadows
 *   a reserved built-in verb.
 * @note Impure — warns on stderr for skipped package stories.
 */
export default function collectPackStories(
  config: PragmaConfig,
  packages: readonly SemanticPackage[],
  reserved: ReservedVerbs,
): PackStoryEntry[] {
  const entries: PackStoryEntry[] = [];
  const taken = new Set<string>();

  for (const definition of config.stories ?? []) {
    if (
      emittedVerbs(definition).some((verb) =>
        isReserved(reserved, definition.noun, verb),
      )
    ) {
      throw PragmaError.configError(
        `Story noun "${definition.noun}" shadows a built-in command.`,
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
      if (
        emittedVerbs(definition).some((verb) =>
          isReserved(reserved, definition.noun, verb),
        ) ||
        taken.has(definition.noun)
      ) {
        process.stderr.write(
          `Warning: skipping story "${definition.noun}" from ${file.path} — the noun is already taken.\n`,
        );
        continue;
      }
      taken.add(definition.noun);
      entries.push({ definition, source: file.path });
    }
  }

  return entries;
}
