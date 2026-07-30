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
}

/** A `packs` entry: a bare npm name or a `{ name, source }` declaration. */
export type PackDeclaration = string | PackSource;

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
  /** Match case-sensitively (default false — loose match, canonical emit). */
  readonly caseSensitive?: boolean;
  /** Per-family opt-out: a noun mapped to `false` drops its name completion. */
  readonly families?: Readonly<Record<string, boolean>>;
}

/** The effective, resolved configuration. `channel` always has a value. */
export interface PragmaConfig {
  /** The distribution's display name. */
  readonly name?: string;
  /** The distribution's one-line help blurb. */
  readonly help?: string;
  /** The distribution's colophon (markdown). */
  readonly colophon?: string;
  /** Where the distribution's users report issues. */
  readonly issuesUrl?: string;
  /** Active tier path, or absent when no tier is configured. */
  readonly tier?: string;
  /** Release channel controlling component visibility. */
  readonly channel: Channel;
  /** Default progressive-disclosure level. */
  readonly detail?: string;
  /** Semantic pack sources; replaces (does not merge) across layers. */
  readonly packs?: readonly PackDeclaration[];
  /** Scaffold generator sources; replaces (does not merge) across layers. */
  readonly generators?: readonly GeneratorSource[];
  /** Declarative read stories compiled at boot (experimental; opaque here). */
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
 */
export interface RawConfig {
  readonly name?: string;
  readonly help?: string;
  readonly colophon?: string;
  readonly issuesUrl?: string;
  readonly tier?: string;
  readonly channel?: Channel;
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
  readonly name: ConfigOrigin;
  readonly help: ConfigOrigin;
  readonly colophon: ConfigOrigin;
  readonly issuesUrl: ConfigOrigin;
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
