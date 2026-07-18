/**
 * Shapes of the completion engine — the model both tiers share, the parsed
 * request the `__complete` resolver answers, and the dynamic-tier seam.
 *
 * The model is derived from the capability modules (the specs), NOT parsed
 * from `surface.v2.json`: the emitted surface deliberately omits enum values,
 * param kinds, and the `complete` field, and the grammar must not grow for a
 * projection. Agreement with the covenant is transitive — the projection
 * agreement test pins the model's noun/verb/flag sets to `emitSurface`, which
 * conformance pins to the golden.
 */

/** The shells the static completion tier can emit scripts for. */
export type Shell = "bash" | "zsh" | "fish";

/** A single completion candidate — always a bare word, never shell syntax. */
export type Candidate = string;

/**
 * Where a value-position's candidates come from (`ParamSpec.complete`
 * resolved against the param kind — see `model.ts` for the defaults table).
 */
export type CompletionSource =
  /** A closed value set (enum params) — inlined by the static tier. */
  | { readonly kind: "values"; readonly values: readonly string[] }
  /** Entity names of a type — the dynamic tier reads them via the seam. */
  | { readonly kind: "entity"; readonly type: string }
  /** File paths — the static scripts delegate to native shell completion. */
  | { readonly kind: "files" }
  /** Nothing to offer. */
  | { readonly kind: "none" };

/** One flag of a verb (or a global/mutation flag) as completion sees it. */
export interface FlagEntry {
  /** The full flag token (`--with-history`). */
  readonly flag: string;
  /** Whether the flag consumes a value (false for booleans). */
  readonly takesValue: boolean;
  /** Whether the flag may repeat (`string[]` params) — never de-offered. */
  readonly repeatable: boolean;
  /** Offered only before a noun is chosen (`--version`). */
  readonly rootOnly?: boolean;
  /** Where the flag's value candidates come from. */
  readonly source: CompletionSource;
}

/** One positional slot of a verb. */
export interface PositionalEntry {
  /** The param name (for diagnostics and projection agreement). */
  readonly name: string;
  /** Whether the positional is required (`<name>` vs `[name]`). */
  readonly required: boolean;
  /** Whether the positional absorbs all further indices (`string[]`). */
  readonly variadic: boolean;
  /** Where the positional's candidates come from. */
  readonly source: CompletionSource;
}

/** One verb (a sub-verb or a noun's self-verb) as completion sees it. */
export interface VerbEntry {
  /** The verb label (`show`; the noun itself for a self-verb). */
  readonly label: string;
  /** Whether the verb mutates — mutation flags are offered iff true. */
  readonly mutates: boolean;
  /** The verb's flags, in declared order. */
  readonly flags: readonly FlagEntry[];
  /** The verb's positionals, in declared order. */
  readonly positionals: readonly PositionalEntry[];
}

/** One noun with its self-verb (if any) and sub-verbs. */
export interface NounEntry {
  /** The noun token. */
  readonly noun: string;
  /** The self-verb (`["info"]`), when the noun is invocable bare. */
  readonly selfVerb?: VerbEntry;
  /** Sub-verbs (`["config","show"]`), sorted by label. */
  readonly verbs: readonly VerbEntry[];
}

/** The completion model: everything both tiers offer, spec-derived. */
export interface CompletionModel {
  /** Every visible noun (plus the bin-served `mcp`), sorted. */
  readonly nouns: readonly NounEntry[];
  /** Global flags offered in every flag position (`rootOnly` filtered). */
  readonly globalFlags: readonly FlagEntry[];
  /** Mutation flags injected for `mutates` verbs. */
  readonly mutationFlags: readonly FlagEntry[];
}

/**
 * What the current word is completing, classified by the argv state machine.
 * Structural contexts carry what to offer; value contexts carry the source.
 */
export type CompletionContext =
  /** Completing the first command token — offer nouns. */
  | { readonly kind: "noun" }
  /** Completing a sub-verb of `noun`. */
  | { readonly kind: "verb"; readonly noun: string }
  /** Completing a flag name — `flags` is already scoped and de-offered. */
  | { readonly kind: "flag-name"; readonly flags: readonly string[] }
  /** Completing a flag's value. */
  | {
      readonly kind: "flag-value";
      readonly flag: string;
      readonly source: CompletionSource;
    }
  /** Completing a positional. */
  | {
      readonly kind: "positional";
      readonly name: string;
      readonly source: CompletionSource;
    }
  /** Nothing to offer; `reason` feeds the debug channel. */
  | { readonly kind: "nothing"; readonly reason: string };

/** A parsed completion request: the classified context plus the partial word. */
export interface CompletionRequest {
  /** The classified context of the word being completed. */
  readonly context: CompletionContext;
  /** The partial text of the word being completed (may be empty). */
  readonly partial: string;
}

/**
 * The dynamic-tier seam: reads entity names for `{kind:"entity"}` sources.
 * PR-C ships only {@link import("./entitySource.js").emptyEntityReader}; the
 * index-backed reader (`createIndexEntityReader`) lands with the PR2 rebase.
 */
export interface EntityNameReader {
  /**
   * The known names of a type (`ds:Block`), or none when unavailable.
   * May be sync or async; failures must surface as an empty list, never throw.
   */
  names(type: string): Promise<readonly string[]> | readonly string[];
}

/** The environment the resolver runs in — the entity seam, nothing else. */
export interface CompletionEnv {
  /** The entity-name reader for `{kind:"entity"}` sources. */
  readonly entities: EntityNameReader;
}
