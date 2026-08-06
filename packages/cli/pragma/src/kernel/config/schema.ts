/**
 * Zod validation for a config layer.
 *
 * One of the FOUR sanctioned zod seams, which is every module in `src/` that
 * value-imports zod:
 *
 * 1. `project/mcp/registerVerb.ts` — tool schemas;
 * 2. this module — the config grammar;
 * 3. `packs/schema.ts` — the pack-definition grammar, lazily imported;
 * 4. `runtime/graphpack/schemas.ts` — the pack-artifact grammar, reached only
 *    from `read.ts`, i.e. behind the store boot.
 *
 * The count is the register this programme keeps and it has been wrong twice,
 * so the arithmetic is written down rather than adjusted. It said "three"
 * before `packs/schema.ts` existed; it then said "four" and described the
 * fifth as something PR7 had *moved away*, which read as elimination — but
 * what PR7 removed is the EDGE from the command-tree graph, not the importer.
 * The schemas left `graphpack/types.ts` for `graphpack/schemas.ts` and the seam
 * count never changed.
 *
 * It reads four again now, and this time an importer really is gone:
 * `spec/validate.ts` held a fifth seam — a zod mirror of the whole capability
 * grammar — whose `validateModule` had ZERO callers outside its own test. Its
 * docblock called it a lazily-imported registration seam; no registration path
 * imported it. Deleting the module is what took the census from five to four.
 *
 * The register is a census of specifiers, not of one specifier. zod publishes
 * subpaths (`zod/v3`, `zod/v4`, `zod/v4/core`, …) and a module importing one of
 * those is a sixth seam that a `grep 'from "zod"'` would not report — which is
 * exactly how `capabilities/lazy.test.ts`'s guard was blind until PR7's second
 * fix-fold. Take the census with `grep -E 'from "zod(/[^"]*)?"'`.
 *
 * None of the four is reached from the `--help` or `__complete` fast path, which
 * are storeless and config-free — `capabilities/lazy.test.ts` holds that as an
 * EXACT empty set over every root its `FAST_PATH_ENTRIES` declares (the process
 * entry, the command tree, `buildProgram`, the completion responder), and
 * `completion/safety.test.ts` holds the same empty set over its five completion
 * roots. Both scans are textual over this package's own relative-import graph
 * and match subpath specifiers.
 *
 * That sentence was wrong for one round and the correction is the point: the
 * empty set was held over `capabilities/index.ts` ALONE — 129 files — while the
 * two surfaces it named are different graphs (`buildProgram.ts` walks 27 files,
 * 16 of them not on the capabilities/index graph; `completion/complete.ts` 23,
 * 6 not) guarded by named-module checks listing 2 of these 5 seams and 1 of
 * them. A guard that overclaims is worse than none, so the guards were widened
 * to match the claim rather than the claim narrowed.
 *
 * Validates the raw shape a global JSON file or an evaluated `pragma.config.ts`
 * declares; unknown keys are stripped for forward compatibility, and only
 * present keys survive so layer merging keeps honest per-field provenance.
 *
 * FOUR edits to the config surface are checked BEFORE validation, each raising
 * a CONFIG_ERROR that names the file AND the edit that fixes it. Two of them —
 * a legacy `packages` key (renamed to `packs`) and a removed
 * `completion.caseSensitive` — exist because the unknown-key stripping would
 * otherwise eat them, and stripping is indistinguishable from working to the
 * person who wrote the file. The other two — a `colophon` declared as a bare string
 * and an out-of-range `detail` — exist because zod DOES reject them, but with a
 * shape or range message that names neither the new form nor the edit. Only the
 * `colophon` one branches its remedy on the layer. See `parseRawConfig`.
 */

import { z } from "zod";
import { DEFAULT_DETAIL_LEVEL, DETAIL_LEVELS } from "../../constants.js";
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
 *   declares the removed `completion.caseSensitive`, when it declares
 *   `colophon` as a bare byline string, or when it declares a `detail`
 *   outside `DETAIL_LEVELS`. The four pre-validation checks all exist for one
 *   reason: a config that USED to be valid must fail with the edit that fixes
 *   it, not with a stripped key, a shape mismatch or a range message — which is
 *   why the `colophon` remedy differs by `layer` and why the `detail` one says
 *   to edit the file rather than to run the setter.
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
  // a config that was VALID before must fail audibly, naming the edit. A
  // `colophon` declared as a bare byline string is `{ markdown, summary? }`
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
  // Range detection, the fourth, and the `colophon` argument again: zod already
  // REJECTS an out-of-range level, and its default enum message is even good —
  // it names the three values. What it cannot carry is the EDIT, and here that
  // matters more than anywhere else in this family, because the repair the
  // reference page names is unreachable from the broken state. Measured on the
  // built binary with a global `config.json` holding `detail: "banana"`:
  // `config set detail summary` exits 1 with the bare zod message and writes
  // nothing, because the layers are read before the setter runs. Every other
  // break this slice landed tells a user what to change; this one told them to
  // run the command their config had already disabled.
  const detail = (value as { detail?: unknown } | null)?.detail;
  if (
    typeof detail === "string" &&
    !(DETAIL_LEVELS as readonly string[]).includes(detail)
  ) {
    throw PragmaError.configError(
      `Invalid config in ${source} at detail: ${JSON.stringify(detail)} is not a detail level. The levels are ${DETAIL_LEVELS.join(", ")}.`,
      {
        recovery: {
          message: `In ${source}, set "detail" to one of ${DETAIL_LEVELS.join(", ")} — or delete the line, which restores the ${DEFAULT_DETAIL_LEVEL} default. Edit the file by hand: "config set detail" reads the config layers before it writes, so it fails with this same error.`,
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
