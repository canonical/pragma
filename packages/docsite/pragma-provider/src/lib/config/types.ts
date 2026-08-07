import type { SchemaPluginApi } from "@canonical/ke-graphql";

/** One Turtle source: its store-visible label and its (escaped) content. */
export interface TtlSource {
  readonly path: string;
  readonly content: string;
}

/** The two filesystem roots the collector walks. */
export interface SourceRoots {
  /** The pragma CLI's refs cache — `<root>/<pkg>/<ref>/{definitions,data}`. */
  readonly refsRoot: string;
  /** The semantics working tree — `<root>/<pkg>/{definitions,data}`. Skipped when absent. */
  readonly semRoot: string;
}

export interface PragmaProviderOptions {
  /** Refs cache root. Default: `$PRAGMA_REFS_DIR`, else {@link DEFAULT_REFS_ROOT}. */
  readonly refsRoot?: string;
  /** Semantics working tree. Default: `$PRAGMA_SEM_DIR`, else {@link DEFAULT_SEM_ROOT}. Skipped when absent. */
  readonly semRoot?: string;
  /**
   * Where to write the emitted SDL. ABSENT MEANS NO WRITE.
   *
   * The path belongs to the CONSUMER; this package never derives one. See
   * `createPragmaProvider.ts`'s header for why this is optional rather than
   * required, and why it has no default.
   */
  readonly sdlOutput?: string;
}

/**
 * The booted provider: a fetch-native handler plus the compiled schema's API.
 *
 * There is no in-process `execute` member. One existed in the app's former
 * `graphql.ts` so the SSR prepare step could skip the HTTP hop, and it was the
 * reason a pre-parsed AST from the app's graphql v16 had to be kept away from
 * ke-graphql's v17 executor. The prepare step now POSTs over HTTP like any
 * other client, so the two graphql versions no longer share a process at all
 * and the whole text-only-boundary discipline is moot.
 */
export interface PragmaProvider {
  readonly handle: (request: Request) => Promise<Response>;
  readonly api: SchemaPluginApi;
}
