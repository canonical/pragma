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
 * Mutation-invocation context — present only for a mutating verb, set by the
 * CLI/MCP projector just before `run`. `preview` is true for a plan-only
 * invocation (`--dry-run` on the CLI, or an MCP tool call without `confirm`): a
 * mutating verb reads it to describe its intended effects WITHOUT performing
 * network or heavy setup, so a preview stays side-effect-free. Real execution
 * leaves it false. This is the generic seam every mutation verb copies.
 */
export interface MutationRuntime {
  /** True for a plan-only preview; false for a real execution. */
  readonly preview: boolean;
}

/**
 * How this invocation reaches the user — populated by the projector for a
 * mutating verb. An interactive verb reads it to pick its prompt strategy: an
 * attended CLI without `--yes` gets a wizard; a non-interactive CLI (or `--yes`)
 * gets flags+defaults; MCP gets params-or-error. `signal` aborts a run.
 *
 * NOTE (PR6): interactive setup mutations reuse this exact shape.
 */
export interface InteractionRuntime {
  /** Both stdin and stdout are a TTY (CLI); always false over MCP. */
  readonly isTTY: boolean;
  /** Which projector is driving this run. */
  readonly transport: "cli" | "mcp";
  /** The user asked to skip an interactive confirmation (`--yes` / MCP confirm). */
  readonly yes: boolean;
  /** Abort signal for the run, if the projector wired one. */
  readonly signal?: AbortSignal;
}

/**
 * The opaque runner options a mutating verb's `run` assembles and the projector
 * spreads into the node interpreter on the REAL-run branch only (never on
 * dry-run/undo, which stay handler-free and mock prompts). It carries the
 * interactivity + progress seam: the prompt handler, the stamping/progress
 * effect callbacks, log routing, and an optional teardown the projector runs in
 * a `finally` (e.g. to dispose an Ink render).
 *
 * The task-effect types are referenced inline so this module carries no static
 * import of the node interpreter — the runtime stays cheap to construct.
 */
export interface RunnerOptions {
  /** Resolve each interactive `Prompt` effect (the injected UI strategy). */
  promptHandler?: (
    effect: import("@canonical/task").Effect & { _tag: "Prompt" },
  ) => Promise<unknown>;
  /** Called before each effect — the stamping + progress seam. */
  onEffectStart?: (effect: import("@canonical/task").Effect) => void;
  /** Called after each effect completes (with its duration). */
  onEffectComplete?: (
    effect: import("@canonical/task").Effect,
    duration: number,
  ) => void;
  /** Route task log output. */
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void;
  // NOTE (PR7): no `cwd` here on purpose. The node interpreter's RunTaskOptions
  // has no cwd — effect paths resolve against `process.cwd()` — so a `cwd` field
  // would be inert. PR7 threads a per-call cwd into BOTH the runner and the
  // SEC-2 path jail atomically (a write dir the jail never validated is a jail
  // bypass); until then the field is deliberately absent rather than a no-op.
  /** Abort signal, forwarded to the interpreter. */
  signal?: AbortSignal;
  /** Teardown run by the projector after the task settles (e.g. unmount Ink). */
  dispose?: () => void | Promise<void>;
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
  /** Mutation context, set by the projector for a mutating verb (else absent). */
  readonly mutation?: MutationRuntime;
  /** How this run reaches the user, set by the projector for a mutating verb. */
  readonly interaction?: InteractionRuntime;
  /**
   * The runner options a mutating verb's `run` assembles for its real
   * execution. NOT readonly: the verb writes it as its last act before
   * returning the Task, and the projector reads it back on the real-run branch.
   */
  exec?: RunnerOptions;
}
