/**
 * Zod validation for a config layer.
 *
 * One of the three sanctioned zod seams (validate.ts / mcp/registerVerb.ts /
 * config/schema.ts) — never reached from the `--help` or `__complete` fast
 * path, which are storeless and config-free. Validates the raw shape a global
 * JSON file or an evaluated `pragma.config.ts` declares; unknown keys are
 * stripped for forward compatibility, and only present keys survive so layer
 * merging keeps honest per-field provenance. Legacy shapes are NOT left to the
 * unknown-key stripping: each is detected before validation and rejected with
 * a loud CONFIG_ERROR naming the file and the fix, so an old config fails
 * telling the user exactly what to change instead of silently ignoring the
 * field. Two today: the `packages` key (renamed to `packs`) and the removed
 * `completion.caseSensitive` field. `generators` was a third until it came back
 * — see `RawConfig.generators`: it went away INERT (validated, layered, read by
 * nothing) and returned LOAD-BEARING at build time.
 */

import { z } from "zod";
import { PragmaError } from "../error/PragmaError.js";
import { CHANNELS, DETAIL_LEVELS, type RawConfig } from "./types.js";

const packDeclarationSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    source: z.string().optional(),
    // Opaque here: the pack grammar is validated by `parsePackDefinition` at
    // dispatch, not by the config layer. Without this key the object arm would
    // STRIP declared stories silently (unknown keys are dropped for forward
    // compatibility), so a pack's stories would vanish with no error.
    stories: z.array(z.unknown()).optional(),
  }),
]);

/**
 * A `create` noun a declared generator package exposes. `key` XOR
 * `keyPrefix`+`axis` is checked here rather than left to the build: a
 * declaration naming neither would otherwise reach codegen and fail there with
 * a message about a missing generator rather than about the config that is
 * wrong.
 */
const generatorNounSchema = z
  .object({
    key: z.string().min(1).optional(),
    keyPrefix: z.string().min(1).optional(),
    axis: z.string().min(1).optional(),
    summary: z.string().min(1),
    useWhen: z.string().min(1),
    examples: z
      .array(z.object({ cmd: z.string().min(1), note: z.string().optional() }))
      .optional(),
    optIn: z.array(z.string().min(1)).optional(),
    withPrefixed: z.array(z.string().min(1)).optional(),
    noDefault: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (noun) =>
      (noun.key !== undefined) !==
      (noun.keyPrefix !== undefined && noun.axis !== undefined),
    {
      message:
        'a generator noun declares either "key", or both "keyPrefix" and "axis" — not neither and not both',
    },
  );

const generatorDeclarationSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  nouns: z.record(z.string().min(1), generatorNounSchema),
});

const completionSchema = z.object({
  minChars: z.number().int().min(0).optional(),
  families: z.record(z.string(), z.boolean()).optional(),
});

/**
 * The `completion` object a raw layer declares, when it declares one — read
 * WITHOUT validation, for the removed-field detection that must run before
 * the schema's unknown-key stripping could hide the key.
 */
function declaredCompletion(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const { completion } = value as { completion?: unknown };
  return typeof completion === "object" && completion !== null
    ? (completion as Record<string, unknown>)
    : null;
}

/**
 * The validator every config layer passes through. EXPORTED for
 * `schema.test.ts`, which compares its field set and each field's optionality
 * against the generated `docs/reference/config.md` — the two are produced
 * independently (the page from `keyof RawConfig`, this from hand-written zod)
 * and `parseRawConfig`'s `as RawConfig` cast means `tsc` cannot catch them
 * drifting apart.
 */
export const rawConfigSchema = z.object({
  name: z.string().min(1).optional(),
  help: z.string().min(1).optional(),
  // Declared toolchain content: the `colophon` verb renders whatever the
  // distribution declares here (markdown body + optional condensed summary).
  colophon: z
    .object({
      markdown: z.string().min(1),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  issuesUrl: z.string().url().optional(),
  tier: z.string().optional(),
  channel: z.enum(CHANNELS).optional(),
  // Closed over the documented ladder, like `channel`: a level the renderer
  // would silently degrade to `standard` is a config error naming the file and
  // the three valid values, not a value `config show` reports as honoured.
  detail: z.enum(DETAIL_LEVELS).optional(),
  packs: z.array(packDeclarationSchema).optional(),
  generators: z.array(generatorDeclarationSchema).optional(),
  stories: z.array(z.unknown()).optional(),
  prefixes: z.record(z.string(), z.string()).optional(),
  completion: completionSchema.optional(),
});

/**
 * Validate a raw config value into a {@link RawConfig}.
 *
 * @param value - The parsed JSON or evaluated module default.
 * @param source - The file path, used in error messages.
 * @returns The validated layer values (only the keys actually present).
 * @throws PragmaError with code `CONFIG_ERROR` on an invalid shape, when the
 *   value declares the legacy `packages` key (renamed to `packs`), or when it
 *   still sets the removed `completion.caseSensitive` field.
 */
export function parseRawConfig(value: unknown, source: string): RawConfig {
  // Rename detection must precede validation: unknown keys are stripped, so a
  // legacy `packages` field would otherwise vanish silently.
  if (typeof value === "object" && value !== null && "packages" in value) {
    throw PragmaError.configError(
      `Invalid config in ${source}: the "packages" field was renamed to "packs". The entry shape is unchanged.`,
      {
        recovery: {
          message: `In ${source}, rename "packages:" to "packs".`,
        },
      },
    );
  }
  // Removed-field detection, before validation for the same reason: the field
  // was accepted and read by NOTHING, so a config still setting one gets a loud
  // error naming the removed field, not silence.
  if ("caseSensitive" in (declaredCompletion(value) ?? {})) {
    throw PragmaError.configError(
      `Invalid config in ${source}: the "completion.caseSensitive" field was removed — it was read by nothing. Completion matching is declared by the grammar, not configured.`,
      {
        recovery: {
          message: `In ${source}, delete "caseSensitive" from "completion".`,
        },
      },
    );
  }
  const result = rawConfigSchema.safeParse(value ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "<root>";
    throw PragmaError.configError(
      `Invalid config in ${source} at ${path}: ${issue?.message ?? "unknown error"}.`,
    );
  }
  return result.data as RawConfig;
}
