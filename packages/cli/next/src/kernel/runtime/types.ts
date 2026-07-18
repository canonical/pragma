/**
 * Runtime context shapes threaded through the kernel.
 *
 * The grammar (`VerbSpec.run`) receives a {@link PragmaRuntime}; the CLI and
 * MCP projectors build one per invocation. The interface grows one field-group
 * per PR as each layer lands — global flags with the CLI projector, resolved
 * config + provenance with the config layer — so a verb only ever sees fields
 * that are actually populated by the time it runs.
 */

import type { DetailLevel, OutputFormat } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";

/**
 * Global flags parsed once, before the command tree runs, and shared by every
 * verb. The renderer reads these to pick a formatter; auto-LLM is recorded
 * separately so inferred mode can shape output without switching behaviour.
 */
export interface GlobalFlags {
  /** Condensed Markdown output for LLM/agent consumption. */
  readonly llm: boolean;
  /** True when `llm` was inferred from a non-interactive stdout, not requested. */
  readonly autoLlm?: boolean;
  /** Selected output format; `--format text` is normalised to `plain`. */
  readonly format: OutputFormat;
  /** Diagnostic output to stderr. */
  readonly verbose: boolean;
  /** Explicit progressive-disclosure level from `--detail`, if any. */
  readonly detail?: DetailLevel;
}

/**
 * A booted store session: the immutable bundle a pack read produces. ke/graphql
 * types are referenced inline so this module carries no static import of the
 * heavy runtime — the store code stays dynamic-import-only.
 */
export interface StoreSession {
  /** The ke triple store (booted from the pack's n-quads cache). */
  readonly store: import("@canonical/ke").Store;
  /** The executable GraphQL schema (rebuilt from the extraction artifact). */
  readonly schema: import("graphql").GraphQLSchema;
  /** Create a fresh execution context bound to a store (accepts a Promise). */
  readonly createContext: (
    store:
      | import("@canonical/ke").Store
      | Promise<import("@canonical/ke").Store>,
  ) => import("@canonical/ke-graphql").CompilerContext;
  /** The prefixes the store (and every query) was built with. */
  readonly prefixes: Readonly<Record<string, string>>;
  /** The storeless entity index shipped with the pack. */
  readonly index: import("./graphpack/types.js").PackIndex;
}

/**
 * The lazy store handle. `get()` memoizes an immutable {@link StoreSession} and
 * throws STORE_UNAVAILABLE when the store is cold; `booted` reports whether the
 * store has actually been constructed (the storeless-guarantee spy target).
 */
export interface LazyStore {
  /** Boot (once) and return the store session; throws STORE_UNAVAILABLE cold. */
  get(): Promise<StoreSession>;
  /** Whether the store has been constructed yet (spy target). */
  readonly booted: boolean;
}

/**
 * The query facade: `graphql` is the default typed spine (executed against the
 * pack's precompiled schema); `sparql` is the raw, auto-prefixed escape hatch.
 * Both boot the store lazily on first use.
 */
export interface QueryFacade {
  /** Execute a GraphQL document against the pack's precompiled schema. */
  graphql(
    document: string,
    variables?: Record<string, unknown> | null,
  ): Promise<import("graphql").ExecutionResult>;
  /** Execute a raw SPARQL query against the store (prefixes auto-applied). */
  sparql(text: string): Promise<import("@canonical/ke").QueryResult>;
}

/**
 * Per-invocation runtime handed to every verb `run`. Storeless verbs use only
 * `cwd`/`version`/`globalFlags`/`loadConfig`; store-backed verbs reach the graph
 * through `store`/`query`. The dispatcher boots the store only for
 * `capability.needsStore` verbs, so a storeless verb never constructs it.
 */
export interface PragmaRuntime {
  /** Directory the invocation resolves project state (config) against. */
  readonly cwd: string;
  /** CLI version string, surfaced by `info`. */
  readonly version: string;
  /** Global flags for this invocation. */
  readonly globalFlags: GlobalFlags;
  /** Memoized layered-config loader (resolved once per invocation). */
  readonly loadConfig: () => Promise<ConfigLayers>;
  /** The lazy store — booted only for `needsStore` verbs. */
  readonly store: LazyStore;
  /** The query facade over the lazy store. */
  readonly query: QueryFacade;
}
