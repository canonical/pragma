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
 * is `satisfies RawConfig` and declares the four identity fields, which are
 * read statically and never merged. A global or project layer declaring one is
 * accepted by the validator and has no effect — `docs/reference/config.md`
 * says so, and `readConfig.test.ts` pins it.
 */
export interface RawConfig {
  readonly name?: string;
  readonly help?: string;
  readonly colophon?: string;
  readonly issuesUrl?: string;
  readonly tier?: string;
  readonly channel?: Channel;
  readonly detail?: DetailLevel;
  readonly packs?: readonly PackDeclaration[];
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
