/**
 * Zod validation for a config layer.
 *
 * One of the three sanctioned zod seams (validate.ts / mcp/registerVerb.ts /
 * config/schema.ts) — never reached from the `--help` or `__complete` fast
 * path, which are storeless and config-free. Validates the raw shape a global
 * JSON file or an evaluated `pragma.config.ts` declares; unknown keys are
 * stripped for forward compatibility, and only present keys survive so layer
 * merging keeps honest per-field provenance. Two edits to the config surface
 * are NOT left to the unknown-key stripping, because stripping and working are
 * indistinguishable to the person who wrote the file: a legacy `packages` key
 * (renamed to `packs`) and a removed `completion.caseSensitive` are each
 * detected BEFORE validation and rejected with a loud CONFIG_ERROR naming the
 * file. Both checks are shallow and exact by design — see `parseRawConfig`.
 */

import { z } from "zod";
import { DETAIL_LEVELS } from "../../constants.js";
import { PragmaError } from "../error/PragmaError.js";
import { CHANNELS, type RawConfig } from "./types.js";

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

// `source` is required until a consumer (PR 6) proves a bare-name default is
// wanted; loosening is non-breaking, tightening is not.
const generatorSourceSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
});

const completionSchema = z.object({
  minChars: z.number().int().min(0).optional(),
  families: z.record(z.string(), z.boolean()).optional(),
});

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
  // Distribution CONTENT, not a byline: the section `colophon` renders first.
  // Optional — a distribution that declares none simply has no first section.
  colophon: z
    .object({
      markdown: z.string().min(1),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  issuesUrl: z.string().url().optional(),
  tier: z.string().optional(),
  channel: z.enum(CHANNELS).optional(),
  // The level tuple is reached from `src/constants.ts`, NOT from `./types.ts`:
  // `pragma.conf.ts` type-imports `types.ts`, and `capabilities/lazy.test.ts`
  // asserts that graph is EXACTLY three files none of which has a value import.
  // So `RawConfig.detail` stays `string` at the type level and zod carries the
  // constraint instead — a declaration is checked at LOAD, not by tsc.
  detail: z.enum(DETAIL_LEVELS).optional(),
  packs: z.array(packDeclarationSchema).optional(),
  generators: z.array(generatorSourceSchema).optional(),
  stories: z.array(z.unknown()).optional(),
  prefixes: z.record(z.string(), z.string()).optional(),
  completion: completionSchema.optional(),
});

/**
 * Validate a raw config value into a {@link RawConfig}.
 *
 * @param value - The parsed JSON or evaluated module default.
 * @param source - The file path, used in error messages.
 * @param layer - Which layer this is. Only the `colophon` remedy branches on it,
 *   and only because that field has no effect outside the distribution layer —
 *   see the check itself. `"user"` (global or project) is the default because
 *   `defaults.ts` is the single distribution-layer caller.
 * @returns The validated layer values (only the keys actually present).
 * @throws PragmaError with code `CONFIG_ERROR` on an invalid shape, when the
 *   value declares the legacy `packages` key (renamed to `packs`), when it
 *   declares the removed `completion.caseSensitive`, or when it declares
 *   `colophon` in the pre-v2 byline-string form. The three pre-validation
 *   checks all exist for one reason: a config that USED to be valid must fail
 *   with the edit that fixes it, not with a stripped key or a shape mismatch —
 *   which is why the `colophon` remedy differs by `layer`.
 */
export function parseRawConfig(
  value: unknown,
  source: string,
  layer: "distribution" | "user" = "user",
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
  // Removal detection, same reason and the same shape as the rename above:
  // `completion.caseSensitive` was validated and read by NOTHING (only
  // `minChars` and `families` reach `setup completions`), so dropping it from
  // the schema would make a config that sets it succeed silently — which is
  // indistinguishable from the field still working.
  //
  // SHALLOW AND EXACT, not a deep scan, for a reason about THIS layer's reach:
  // `stories` and `packs[].stories` are `z.array(z.unknown())` — deliberately
  // opaque, because the pack grammar is `parsePackDefinition`'s to judge at
  // dispatch, not this schema's. A deep scan would therefore reject on ANY
  // nested key spelled `caseSensitive`: a package-shipped story, a
  // forward-compatible field, a sample payload — none of which this layer has
  // the grammar to read, and every one of which would take down every command,
  // `doctor` and `sources update` included. `schema.test.ts` pins BOTH halves
  // against this function directly ("treats a declared story's payload as
  // opaque"); `readConfig.test.ts` pins the `packages` precedent through the
  // layered reader.
  const completion = (value as { completion?: unknown } | null)?.completion;
  if (
    typeof completion === "object" &&
    completion !== null &&
    "caseSensitive" in completion
  ) {
    throw PragmaError.configError(
      `Invalid config in ${source}: "completion.caseSensitive" was removed. Nothing ever read it, and nothing it could have set exists: completion matching is case-insensitive everywhere, and no declared story or config layer can change that.`,
      {
        recovery: {
          message: `In ${source}, delete the "caseSensitive" line under "completion".`,
        },
      },
    );
  }
  // Shape detection, the third of these and the same argument as the two above:
  // a config that was VALID before must fail audibly, naming the edit. The
  // pre-v2 `colophon` was a bare byline string; it is `{ markdown, summary? }`
  // now. Unlike the two above this one does not vanish — zod rejects it — but it
  // rejects it with "Expected object, received string" and no recovery, which
  // names the field and not the new shape. Every other break this slice landed
  // carries the fix; this is that one carrying it too.
  //
  // THE REMEDY BRANCHES ON THE LAYER, and it is the only one here that does.
  // `colophon` is distribution-only: `readConfig.ts` deliberately does not
  // `pick` it, so a global or project layer's value is accepted and ignored.
  // Told to "write the declaration shape" there, a user makes the edit, is
  // believed, and gets NOTHING — measured: following the unbranched recovery in
  // a global `config.json` left `colophon --format llm` still printing the
  // distribution's own body. That is the silent state this whole check family
  // exists to eliminate, reintroduced by the check's own advice. So a user layer
  // is told to DELETE the line (the shape the `caseSensitive` removal above
  // uses), and only the distribution layer is told to rewrite it.
  const colophon = (value as { colophon?: unknown } | null)?.colophon;
  if (typeof colophon === "string") {
    throw PragmaError.configError(
      `Invalid config in ${source}: "colophon" is a declaration now, not a byline string. It carries the Markdown BODY the colophon command renders.`,
      {
        recovery: {
          message:
            layer === "distribution"
              ? `In ${source}, write colophon: { markdown: "<the body>" } — and add a short "summary" beside it, which is what --format llm emits.`
              : `In ${source}, delete the "colophon" line: only the distribution's own config declares a colophon, and a value here has no effect whatever shape it is in.`,
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
