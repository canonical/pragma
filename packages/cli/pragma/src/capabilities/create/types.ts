import type { CREATE_SURFACE } from "./surface.generated.js";

/**
 * The `create` nouns. Derived from the GENERATED surface, which the build
 * derives from `pragma.conf.ts`'s `generators` declaration — so the union is
 * whatever the distribution declares, and a fork that declares a different set
 * gets a different union with no edit here.
 *
 * Deliberately free of any summon-core / generator import, so a module that only
 * needs this type (e.g. `create.verb`) does not drag `pickGenerator` — and its
 * heavy generator imports — into the static graph.
 */
export type CreateKind = keyof typeof CREATE_SURFACE;

/**
 * A generator prompt as the DATA module carries it: the JSON-serialisable
 * subset of summon's `PromptDefinition`.
 *
 * `when` and `validate` are functions and cannot cross into a data module.
 * `when` survives as {@link conditional}, which is all the grammar adapter reads
 * it for (`required = default === undefined && !when`); `validate` stays on the
 * live generator, where summon's `validateAnswers` enforces it inside `execute`
 * — so a flag or MCP-arg run is rejected by the same rule a wizard applies.
 */
export interface SerializedPrompt {
  readonly name: string;
  readonly type: "text" | "confirm" | "select" | "multiselect";
  readonly message: string;
  readonly default?: unknown;
  readonly positional?: boolean;
  readonly choices?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly conditional?: boolean;
}

/**
 * The three fields a declared framework axis contributes, plus the prefix they
 * resolve against — written together by the codegen or not at all, so
 * `buildParams` and `pickGenerator` each read the whole axis off ONE guard.
 */
export interface AxisSurface {
  readonly axis: string;
  readonly axisValues: readonly string[];
  readonly axisDoc: string;
  readonly keyPrefix: string;
}

/**
 * One noun's entry in the generated `create` surface — the CONTRACT between
 * `scripts/generateCreateSurface.ts`, which writes it, and the three modules
 * that read it (`create.verb.ts`, `pickGenerator.ts`, and the tests that pin
 * it).
 *
 * DECLARED ONCE, and that is a correction. The writer returned
 * `Record<string, unknown>` and each reader re-declared the partial view it
 * needed as an inline `as` cast — six of them across three files. Measured on
 * exactly that shape: dropping a REQUIRED field was caught (the cast failed),
 * but RENAMING an optional one (`axisDoc` → `axisHelp`) type-checked clean at
 * `tsc --strict`, and `buildParams` then returned `[]` — the `--framework` enum
 * silently gone from `--help`, the MCP arg schema and the reference. For this
 * distribution one literal test caught it; for a fork's axis noun nothing would.
 *
 * The generated module keeps its `as const` — `CreateKind` is `keyof` it, so a
 * `Record<string, NounSurface>` annotation there would widen the noun union back
 * to `string`. The type is enforced at the WRITER instead, where a wrong field
 * is authored.
 */
export interface NounSurface extends Partial<AxisSurface> {
  /** The declaring package — the key into the generated module map. */
  readonly package: string;
  /** The generator-map key this noun runs (an axis noun's DEFAULT). */
  readonly key: string;
  readonly summary: string;
  readonly useWhen: string;
  readonly examples: ReadonlyArray<{
    readonly cmd: string;
    readonly note?: string;
  }>;
  readonly prompts: readonly SerializedPrompt[];
  /** Declared help text overriding a prompt's derived doc, by prompt name. */
  readonly docs: Readonly<Record<string, string>>;
  /** The positional argument `assertInsideWorkspace` jails (SEC-2). */
  readonly pathParam?: string;
  /** CLI include-flag name → generator prompt name (`withSsr` → `ssr`). */
  readonly aliases: Readonly<Record<string, string>>;
  readonly optIn: readonly string[];
  readonly noDefault: readonly string[];
}
