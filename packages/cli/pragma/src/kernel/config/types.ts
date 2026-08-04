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
 * The distribution's own colophon section — hand-written CONTENT.
 *
 * `pragma colophon` used to lead with a narrative hardcoded in
 * `capabilities/colophon/pragmaColophon.ts`, which a fork inherited: measured at
 * 4 / 2 / 6 occurrences of this distribution's name (plain / llm / json) on a
 * fork build, and the last file in the tree a fork read in another
 * distribution's voice. It is a declaration now, so a fork's colophon is its
 * own — including, deliberately, the architecture narrative: a distribution that
 * forks the kernel is free to describe machinery it may have changed.
 *
 * `summary` is required by BEHAVIOUR, not taste: `--format llm` emits
 * `summary ?? markdown`, so a distribution declaring only a body makes
 * `colophon --format llm` print the whole essay at an agent.
 */
export interface ColophonDeclaration {
  /** The Markdown BODY, with no leading H1 — the renderer supplies the title. */
  readonly markdown: string;
  /** The condensed body `--format llm` prefers. Same rule: no leading H1. */
  readonly summary?: string;
}

/** A `generators` entry: a scaffold generator's npm/git/file source ref. */
export interface GeneratorSource {
  readonly name: string;
  readonly source: string;
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
 * IDENTITY IS NOT HERE. `name`, `help`, `colophon` and `issuesUrl` are read
 * from `pragma.conf.ts` by `src/constants.ts` at module load, because the
 * surfaces that need them — `--help`, `__complete`, the MCP handshake,
 * first-run onboarding — all run before or without the config layer. They stay
 * in {@link RawConfig} (the distribution config is `satisfies RawConfig`), but
 * merging them into the effective config only bought `config show` a
 * `[project]` marker the kernel does not honour.
 */
export interface PragmaConfig {
  /** Active tier path, or absent when no tier is configured. */
  readonly tier?: string;
  /** Release channel controlling component visibility. */
  readonly channel: Channel;
  /**
   * Default progressive-disclosure level — one of `constants.DETAIL_LEVELS`.
   * Typed `string` rather than the level union DELIBERATELY: `pragma.conf.ts`
   * type-imports this module and `capabilities/lazy.test.ts` asserts that
   * import graph is exactly three files, none of which has a value import, so
   * the tuple cannot be reached from here without dragging `constants.ts` (and
   * its two value imports) onto the storeless fast path. `config/schema.ts`
   * carries the constraint as a `z.enum` instead, which means an out-of-range
   * level fails at config LOAD rather than at type-check.
   */
  readonly detail?: string;
  /** Semantic pack sources; replaces (does not merge) across layers. */
  readonly packs?: readonly PackDeclaration[];
  /** Scaffold generator sources; replaces (does not merge) across layers. */
  readonly generators?: readonly GeneratorSource[];
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
 * is `satisfies RawConfig` and declares the four identity fields, which are
 * read statically and never merged. A global or project layer declaring one is
 * accepted by the validator and has no effect — `docs/reference/config.md`
 * says so, and `readConfig.test.ts` pins it.
 */
export interface RawConfig {
  readonly name?: string;
  readonly help?: string;
  readonly colophon?: ColophonDeclaration;
  readonly issuesUrl?: string;
  readonly tier?: string;
  readonly channel?: Channel;
  /** See {@link PragmaConfig.detail} for why this is `string`, not the union. */
  readonly detail?: string;
  readonly packs?: readonly PackDeclaration[];
  readonly generators?: readonly GeneratorSource[];
  readonly stories?: readonly unknown[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly completion?: CompletionConfig;
}

/** Which layer supplied an effective field value. */
export type ConfigOrigin = "default" | "global" | "project";

/** Per-field provenance for the effective merged config. */
export interface ConfigOrigins {
  readonly tier: ConfigOrigin;
  readonly channel: ConfigOrigin;
  readonly detail: ConfigOrigin;
  readonly packs: ConfigOrigin;
  readonly generators: ConfigOrigin;
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
