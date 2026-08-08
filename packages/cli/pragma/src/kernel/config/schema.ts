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
 * wrong. `scripts/build.ts` runs this validator over the target's declaration
 * — a fork's included — before it reads a single field, so that is true for
 * every distribution and not only the shipped one.
 *
 * EXCLUSIVE OVER ALL THREE FIELDS, which the first version was not: it compared
 * `key !== undefined` against `keyPrefix && axis`, so `{key, axis}` read as
 * `true !== false` and was ACCEPTED. Downstream, `deriveNounSurface` drops the
 * prompt an `axis` names — so an ignored `axis` silently DELETED a required
 * positional from the generated surface, with no enum flag to replace it and
 * nothing red. Measured: `{key: "package", axis: "name"}` parsed, and the
 * emitted `create package` lost its `name` param entirely.
 */
const generatorNounSchema = z
  .object({
    key: z.string().min(1).optional(),
    keyPrefix: z.string().min(1).optional(),
    axis: z.string().min(1).optional(),
    axisDoc: z.string().min(1).optional(),
    summary: z.string().min(1),
    useWhen: z.string().min(1),
    examples: z
      .array(z.object({ cmd: z.string().min(1), note: z.string().optional() }))
      .optional(),
    optIn: z.array(z.string().min(1)).optional(),
    withPrefixed: z.array(z.string().min(1)).optional(),
    noDefault: z.array(z.string().min(1)).optional(),
    docs: z.record(z.string().min(1), z.string().min(1)).optional(),
    pathParam: z.string().min(1).optional(),
  })
  .refine(
    (noun) => {
      const byKey =
        noun.key !== undefined &&
        noun.keyPrefix === undefined &&
        noun.axis === undefined;
      const byAxis =
        noun.key === undefined &&
        noun.keyPrefix !== undefined &&
        noun.axis !== undefined;
      return byKey || byAxis;
    },
    {
      message:
        'a generator noun declares either "key" ALONE, or both "keyPrefix" and "axis" and no "key" — no mixture of the two forms, and never neither',
    },
  )
  // The axis flag is the CLI's own invention — it mirrors no prompt, so nothing
  // derives its help text. It used to be the literal "Component framework." in
  // `create.verb.ts`, applied to every fork's axis whatever it was. Requiring
  // the doc beside the axis is what keeps that string out of capability code.
  // A plain CO-PRESENCE rule, the same shape as the form refine above, because
  // `axisDoc` is its own field: it used to live inside `docs` under the axis
  // name, which cost this refine a reach into another map and cost the codegen
  // two more exceptions downstream.
  .refine(
    (noun) => (noun.axis === undefined) === (noun.axisDoc === undefined),
    {
      message:
        'a generator noun declares "axis" and "axisDoc" together or neither — the axis flag mirrors no prompt, so nothing derives its help text',
    },
  );

const generatorDeclarationSchema = z.object({
  name: z.string().min(1),
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
 * The DISTRIBUTION validator — every field, `generators` included, checked to
 * the depth the build reads it at. A user layer passes through
 * {@link layerConfigSchema} instead, which differs in that one field alone.
 * EXPORTED for
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
 * The LAYER validator: {@link rawConfigSchema} with `generators` accepted
 * SHALLOWLY.
 *
 * `generators` is distribution-only and read at BUILD time, and the reference
 * says so in the words "a layer declaring it is accepted and ignored" — the
 * same contract the four identity fields carry. Those are bare strings and
 * cannot fail; `generators` was the first ignored field with a validator deep
 * enough to REFUSE a whole config over a block the binary would then discard.
 * Measured: a project config declaring one noun without `useWhen` was rejected
 * with `at generators.0.nouns.widget.useWhen: Required`, naming a rule that
 * governs a build the user is not running. Shallow here makes the documented
 * contract true; the build's own `parseRawConfig` call is where the deep rules
 * apply, and it is the only place they can change anything.
 */
const layerConfigSchema = rawConfigSchema.extend({
  generators: z.array(z.unknown()).optional(),
});

/**
 * Which config the value IS: the distribution's own `pragma.conf.ts` (a
 * parameter of the build, and of `defaults.ts`) or a user's global/project
 * layer. It selects how far `generators` is validated, and nothing else.
 *
 * LOCAL. It annotates {@link parseRawConfig}'s parameter and has no other
 * reader: all six call sites pass the literal inline. Exporting it would grow
 * this module's public surface by a name nobody imports, and invite the next
 * reader to hold a `ConfigScope`-typed variable somewhere.
 */
type ConfigScope = "distribution" | "layer";

/**
 * Validate a raw config value into a {@link RawConfig}.
 *
 * @param value - The parsed JSON or evaluated module default.
 * @param source - The file path, used in error messages.
 * @param scope - Whether this is the distribution config or a user layer. No
 *   default: the two callers of each kind should say which they are.
 * @returns The validated layer values (only the keys actually present).
 * @throws PragmaError with code `CONFIG_ERROR` on an invalid shape, when the
 *   value declares the legacy `packages` key (renamed to `packs`), or when it
 *   still sets the removed `completion.caseSensitive` field.
 */
export function parseRawConfig(
  value: unknown,
  source: string,
  scope: ConfigScope,
): RawConfig {
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
  const schema = scope === "distribution" ? rawConfigSchema : layerConfigSchema;
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "<root>";
    throw PragmaError.configError(
      `Invalid config in ${source} at ${path}: ${issue?.message ?? "unknown error"}.`,
    );
  }
  return result.data as RawConfig;
}
