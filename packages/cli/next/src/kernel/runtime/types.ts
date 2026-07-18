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
 * Per-invocation runtime handed to every verb `run`. Storeless in PR1 — the
 * store handle and query facade join with the runtime/store layer (the
 * dispatcher boots the store only for `capability.needsStore` verbs).
 */
export interface PragmaRuntime {
  /** Directory the invocation resolves project state (config) against. */
  readonly cwd: string;
  /** CLI version string, surfaced by `info`. */
  readonly version: string;
  /** Global flags for this invocation. */
  readonly globalFlags: GlobalFlags;
}
