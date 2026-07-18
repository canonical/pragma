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

/** The object form of a package source declaration. */
export interface PackageDeclaration {
  readonly name: string;
  readonly source?: string;
}

/** A `packages` entry: a bare npm name or a `{ name, source }` declaration. */
export type PackageEntry = string | PackageDeclaration;

/** The effective, resolved configuration. `channel` always has a value. */
export interface PragmaConfig {
  /** Active tier path, or absent when no tier is configured. */
  readonly tier?: string;
  /** Release channel controlling component visibility. */
  readonly channel: Channel;
  /** Default progressive-disclosure level. */
  readonly detail?: string;
  /** Semantic package sources; replaces (does not merge) across layers. */
  readonly packages?: readonly PackageEntry[];
  /** Declarative read stories compiled at boot (experimental; opaque here). */
  readonly stories?: readonly unknown[];
  /** Additional namespace prefixes merged over the built-in map. */
  readonly prefixes?: Readonly<Record<string, string>>;
  /** Named prompt overrides (global machine state). */
  readonly prompts?: Readonly<Record<string, unknown>>;
}

/**
 * The fields a single config layer (global JSON or project TS) may declare. A
 * key is present only when that layer sets it — presence drives which layer
 * wins during the merge.
 */
export interface RawConfig {
  readonly tier?: string;
  readonly channel?: Channel;
  readonly detail?: string;
  readonly packages?: readonly PackageEntry[];
  readonly stories?: readonly unknown[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly prompts?: Readonly<Record<string, unknown>>;
}

/** Which layer supplied an effective field value. */
export type ConfigOrigin = "default" | "global" | "project";

/** Per-field provenance for the effective merged config. */
export interface ConfigOrigins {
  readonly tier: ConfigOrigin;
  readonly channel: ConfigOrigin;
  readonly detail: ConfigOrigin;
  readonly packages: ConfigOrigin;
  readonly stories: ConfigOrigin;
  readonly prefixes: ConfigOrigin;
  readonly prompts: ConfigOrigin;
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
