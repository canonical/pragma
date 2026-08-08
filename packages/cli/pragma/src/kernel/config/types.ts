/**
 * Configuration data shapes.
 *
 * The v2 config is deliberately smaller than v1's: no `trace`, no `framework`.
 * A {@link PragmaConfig} is resolved from three layers — built-in defaults, the
 * global XDG JSON, and the nearest evaluated `pragma.config.ts` — each field
 * carrying its {@link ConfigOrigin} so `config show` reports honest provenance.
 */

/** Allowed release channel values. */
export const CHANNELS = ["normal", "experimental", "prerelease"] as const;

/** A release channel name. */
export type Channel = (typeof CHANNELS)[number];

/**
 * Progressive-disclosure levels, least to most detail. Declared HERE, beside
 * {@link CHANNELS}, because the config validator closes `detail` over this set
 * and this module is the one config module the storeless fast path may reach
 * (`completion/safety.test.ts` positive-lists it; `capabilities/lazy.test.ts`
 * pins it inert). `src/constants.ts` re-exports it for every other reader.
 */
export const DETAIL_LEVELS = ["summary", "standard", "detailed"] as const;

/** A progressive-disclosure level. */
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

/** The object form of a pack source declaration. */
export interface PackSource {
  readonly name: string;
  readonly source?: string;
  /**
   * Declarative read stories this pack supplies, in the pack grammar
   * (`kernel/packs/types.PackDefinition`). OPAQUE here on purpose — the config
   * layer does not know that grammar; `parsePackDefinition` validates it at
   * dispatch. Declared beside the pack so a story can move out to the package's
   * own `stories/*.json` by deleting this field and nothing else.
   */
  readonly stories?: readonly unknown[];
}

/** A `packs` entry: a bare npm name or a `{ name, source }` declaration. */
export type PackDeclaration = string | PackSource;

/**
 * The toolchain colophon the distribution declares — CONTENT, not machinery.
 * The `colophon` verb renders whatever is declared here as its first section,
 * titled with the distribution's name; a fork tells its own story by editing
 * its config. Both strings are Markdown BODIES with no leading H1 (the
 * renderer supplies the heading). `summary` is the condensed `--format llm`
 * form; omitted, the full `markdown` serves both.
 */
export interface ColophonDeclaration {
  readonly markdown: string;
  readonly summary?: string;
}

/**
 * One `create` noun a declared generator package exposes.
 *
 * `key` names the generator-map entry the noun runs. `keyPrefix` + `axis`
 * declare a FRAMEWORK AXIS instead: the noun collapses several generators
 * (`component/react`, `component/svelte`, `component/lit`) into one verb plus an
 * enum flag named by `axis`, whose values are the map keys under the prefix, in
 * map order, the first being the default. Exactly one of the two forms.
 *
 * `summary` and `examples` are CONTENT, not derivable: a generator's own
 * `meta.description` describes it to `summon`, and its `meta.examples` are
 * `summon …` invocations. `examples[].cmd` OMITS the binary name — the spec
 * builder composes it from `BIN_NAME`, the same rule `emptyRecovery.cli` follows
 * and `kernel/copy.test.ts` enforces over `src/capabilities/**`.
 *
 * The last three are CLI-GRAMMAR facts about prompts, not generator facts:
 *  - `optIn` names confirm prompts forced to `default: false`, because the
 *    grammar has no `--no-` form and a default-true boolean could never be
 *    turned off;
 *  - `withPrefixed` names prompts exposed under the `--with-X` include-flag
 *    convention (`ssr` → `--with-ssr`), re-keyed back at the one CLI↔generator
 *    seam so the generator's prompt names, templates and goldens stay stable;
 *  - `noDefault` names params whose ParamSpec default is dropped so the
 *    SELECTED axis value's own prompt default applies instead.
 */
export interface GeneratorNoun {
  readonly key?: string;
  readonly keyPrefix?: string;
  readonly axis?: string;
  /**
   * The `axis` flag's own help text — declared beside the axis, and required
   * with it: the schema enforces plain CO-PRESENCE, the same shape as the
   * `key` XOR `keyPrefix`+`axis` rule next to it.
   *
   * ITS OWN FIELD, and that is a correction. It was declared inside {@link docs}
   * under the axis name, which made ONE map hold two vocabularies — generator
   * prompt names, plus one CLI-invented flag name — and every consumer paid for
   * the merge: a schema refine reaching into `docs`, an `axis` parameter and an
   * exclusion in the codegen's prompt-name assertion, and a filter putting the
   * axis key back out before emission. Three special cases for one string that
   * the surface already emitted as a separate `axisDoc` field. `docs` now means
   * exactly one thing, so any future field mirroring prompt names inherits the
   * plain rule rather than the exception.
   *
   * The string itself is CONTENT because the alternative was a literal: the doc
   * used to be `"Component framework."` inside `create.verb.ts`, applied to
   * whatever axis a fork declared — so an ACME fork's `--flavour` was documented
   * in `--help`, `docs/reference/` and its MCP schema as Canonical's component
   * framework.
   */
  readonly axisDoc?: string;
  readonly summary: string;
  /**
   * The MCP catalog's `use_when` behavioural hint — CONTENT, like `summary`,
   * and addressed to a different reader: `summary` tells a human what the verb
   * does, `useWhen` tells an agent when to reach for it. Declared rather than
   * hand-written in `capabilities/hints.ts`, because that table is keyed per
   * tool and `capabilities.test.ts` fails a live tool that has none — so a fork
   * adding a `create` noun would otherwise add a red test with it.
   */
  readonly useWhen: string;
  readonly examples?: readonly {
    readonly cmd: string;
    readonly note?: string;
  }[];
  readonly optIn?: readonly string[];
  readonly withPrefixed?: readonly string[];
  readonly noDefault?: readonly string[];
  /**
   * Help text overriding what the build derives from a prompt's `message`,
   * keyed by GENERATOR PROMPT NAME — every key, with no exception. The axis
   * flag has no prompt and declares its doc as {@link axisDoc} instead.
   *
   * CONTENT, and the last create-surface string that was not. A wizard question
   * usually reads as help once `declarativeDoc` strips its `?`/`:`, but not
   * always: `summon-component` asks `Component path:` where `--help` and the
   * MCP arg schema want the naming rule the old hand-written mirror carried
   * ("its final segment is the PascalCase component name"). A key matching no
   * prompt is a build error, like every other declared name that mirrors one.
   */
  readonly docs?: Readonly<Record<string, string>>;
  /**
   * The positional argument `assertInsideWorkspace` jails (SEC-2), when the
   * build cannot derive it.
   *
   * The derivation is a NAME HEURISTIC — a positional `text` prompt whose name
   * ends in `path` or `dir` — and its only failure mode is silence: yielding
   * `undefined` DELETES the jail rather than failing, because `create.verb.ts`
   * jails only `if (pathParam)`. That heuristic fits the shipped generators and
   * no fork is bound by it, so a noun whose positional path prompt is called
   * `target` or `into` names it here. A positional text prompt that neither the
   * heuristic nor this field selects is a BUILD ERROR: an unjailed positional
   * must never be a silent absence.
   */
  readonly pathParam?: string;
}

/**
 * A generator package the distribution links in, and the `create` nouns it
 * exposes.
 *
 * `name` is the specifier `scripts/build.ts` writes into the generated static
 * import — `bun build --compile` bundles only LITERAL specifiers, and the build
 * writes them. It is also the whole identity of the package here: the build
 * asserts the name is a key of the distribution's own `dependencies`, because
 * the dependency — not the declaration — is what installs and links. There is
 * deliberately no `source` field restating that dependency's range; a
 * declaration that repeats `package.json` earns nothing and can only disagree
 * with it.
 */
export interface GeneratorDeclaration {
  readonly name: string;
  readonly nouns: Readonly<Record<string, GeneratorNoun>>;
}

/**
 * Completion policy, read at `setup completions` emit time (never on the
 * storeless `__complete` fast path). Derive-by-default, tune-by-exception:
 * `minChars` gates the `__complete` exec in the generated scripts, and
 * `families` opts a noun out of name completion (`{ <family>: false }`).
 */
export interface CompletionConfig {
  /** Minimum typed chars before the shell execs `__complete` (default 2). */
  readonly minChars?: number;
  /** Per-family opt-out: a noun mapped to `false` drops its name completion. */
  readonly families?: Readonly<Record<string, boolean>>;
}

/**
 * The effective, resolved configuration. `channel` always has a value.
 *
 * IDENTITY IS NOT HERE. `name`, `help` and `issuesUrl` are read from
 * `pragma.conf.ts` by `src/constants.ts` at module load, because the surfaces
 * that need them — `--help`, `__complete`, the MCP handshake, first-run
 * onboarding — all run before or without the config layer; `colophon` is read
 * from the same file at render time by the `colophon` verb. They stay in
 * {@link RawConfig} (the distribution config is `satisfies RawConfig`), but
 * merging them into the effective config only bought `config show` a
 * `[project]` marker the kernel does not honour.
 */
export interface PragmaConfig {
  /** Active tier path, or absent when no tier is configured. */
  readonly tier?: string;
  /** Release channel controlling component visibility. */
  readonly channel: Channel;
  /** Default progressive-disclosure level. */
  readonly detail?: DetailLevel;
  /** Semantic pack sources; replaces (does not merge) across layers. */
  readonly packs?: readonly PackDeclaration[];
  /** Declarative read stories, compiled at DISPATCH (opaque here). */
  readonly stories?: readonly unknown[];
  /**
   * Namespace prefixes the pack is built with — they win every harvest, so a
   * layer here decides what the store binds and what the index is keyed under.
   * The DISTRIBUTION layer's entries additionally seed the compiled-in
   * `DEFAULT_PREFIX_MAP`; a project layer's do not, because that map is read on
   * the storeless fast path where no config layer exists.
   */
  readonly prefixes?: Readonly<Record<string, string>>;
  /** Completion policy (read at `setup completions` emit time). */
  readonly completion?: CompletionConfig;
}

/**
 * The fields a single config layer (global JSON or project TS) may declare. A
 * key is present only when that layer sets it — presence drives which layer
 * wins during the merge.
 *
 * WIDER than {@link PragmaConfig}: the DISTRIBUTION layer (`pragma.conf.ts`)
 * is `satisfies RawConfig` and declares the four identity fields plus
 * `generators`, all of which are read outside the merge — the identity fields
 * at module load, `generators` at BUILD time. A global or project layer
 * declaring one is accepted by the validator and has no effect —
 * `docs/reference/config.md` says so, and `readConfig.test.ts` pins it.
 */
export interface RawConfig {
  readonly name?: string;
  readonly help?: string;
  readonly colophon?: ColophonDeclaration;
  readonly issuesUrl?: string;
  readonly tier?: string;
  readonly channel?: Channel;
  readonly detail?: DetailLevel;
  readonly packs?: readonly PackDeclaration[];
  readonly stories?: readonly unknown[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly completion?: CompletionConfig;
  /**
   * The generator packages the DISTRIBUTION links in, and the `create` nouns
   * they expose. Read at BUILD time by `scripts/build.ts`, which writes the
   * literal import specifiers and the derived create surface from it — so it is
   * distribution-only, exactly like the identity fields, and deliberately NOT in
   * {@link PragmaConfig}. A global or project layer cannot change which modules
   * were linked into an already-compiled binary; merging it would let
   * `config show` report a value the binary does not honour.
   */
  readonly generators?: readonly GeneratorDeclaration[];
}

/** Which layer supplied an effective field value. */
export type ConfigOrigin = "default" | "global" | "project";

/** Per-field provenance for the effective merged config. */
export interface ConfigOrigins {
  readonly tier: ConfigOrigin;
  readonly channel: ConfigOrigin;
  readonly detail: ConfigOrigin;
  readonly packs: ConfigOrigin;
  readonly stories: ConfigOrigin;
  readonly prefixes: ConfigOrigin;
}

/** A resolved config layer's file location and existence. */
export interface ConfigLayer {
  readonly path: string;
  readonly exists: boolean;
}

/** The layered config resolution result. */
export interface ConfigLayers {
  /** The effective merged configuration (defaults < global < project). */
  readonly config: PragmaConfig;
  /** Which layer supplied each effective field. */
  readonly origins: ConfigOrigins;
  /** The global XDG layer. */
  readonly global: ConfigLayer;
  /** The project layer (absent `path` when no project config was found). */
  readonly project: { readonly path?: string; readonly exists: boolean };
}
