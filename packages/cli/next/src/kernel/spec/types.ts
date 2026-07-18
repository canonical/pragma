/**
 * The one grammar. Every capability is described by this vocabulary and
 * nothing else: the CLI projector, the MCP projector, the surface emitter,
 * and the completion resolver all read these shapes. Do NOT add fields — a
 * new projection need is a signal to reshape an existing field, not to grow
 * the grammar, so the surface covenant stays the single source of truth.
 *
 * Naming rule: `[noun]` -> CLI `pragma <noun>`, tool `<noun>`;
 * `[noun, verb]` -> CLI `pragma <noun> <verb>`, tool `<noun>_<verb>`.
 * Positionals are params with `positional: true`, in declared order; every
 * other param is a kebab-cased flag.
 */

import type { Task } from "@canonical/task";
import type { PragmaRuntime } from "../runtime/types.js";

/** MCP tool annotations mirrored onto exposed verbs. */
export type McpAnnotations = {
  readOnlyHint: boolean;
  destructiveHint?: boolean;
  openWorldHint: boolean;
};

/**
 * Effect + exposure profile of a verb. `mutates` is the discriminator for the
 * effect seam: reads are plain async, mutations return a `Task`. `mcp` decides
 * whether the verb is projected as a tool (and why not, when withheld).
 */
export type Capability = {
  needsStore: boolean;
  mutates: boolean;
  destructive?: boolean;
  needsNetwork?: boolean;
  interactive?: boolean;
  mcp:
    | { expose: true; annotations?: McpAnnotations }
    | { expose: false; reason: string };
};

/**
 * A storeless name source the completion engine resolves candidates against.
 * `__complete` never boots the graph, so every source is disk-readable: the
 * precomputed pack index, the filesystem, or the prefix table.
 */
export type CompletionFrom =
  | "index"
  | "skills"
  | "tiers"
  | "prompts"
  | "prefixes";

/** A reference to one name source (with an optional prefixed type filter). */
export interface CompletionSourceRef {
  /** Which storeless source to read candidate names from. */
  readonly from: CompletionFrom;
  /** Prefixed type filter — meaningful only for `from: "index"` (empty = any). */
  readonly type?: string;
}

/** How a partial word is matched against candidate names. */
export type CompletionMatch = "prefix" | "substring" | "fuzzy";

/**
 * The declared autocomplete policy the engine executes generically — the
 * "name-source" mode of {@link ParamComplete}. Derive-by-default, tune-by-field.
 */
export interface AutocompleteHeuristic {
  /** Where the completable names come from. */
  readonly source: CompletionSourceRef;
  /** Match strategy against the partial (default `"substring"`). */
  readonly match?: CompletionMatch;
  /**
   * Minimum typed chars before the generated shell script execs `__complete`
   * for this source (default 2). Enforced at emit time; see `emitScripts`.
   */
  readonly minChars?: number;
  /** Match case-sensitively (default `false` — loose match, canonical emit). */
  readonly caseSensitive?: boolean;
  /** Opt-out knob — `false` disables completion for the param (default `true`). */
  readonly enabled?: boolean;
}

/**
 * How a param's values are completed by the static/dynamic completion tiers.
 * The `names` arm carries the {@link AutocompleteHeuristic}; `values`/`files`/
 * `none` are unchanged. (Was `{ kind: "entity"; type }` — generalized so every
 * object family, not only graph-backed reads, completes at the cursor.)
 */
export type ParamComplete =
  | { kind: "values" }
  | { kind: "files" }
  | { kind: "none" }
  | ({ kind: "names" } & AutocompleteHeuristic);

/** A single parameter of a verb — a positional or a kebab-cased flag. */
export type ParamSpec =
  | {
      kind: "string" | "boolean" | "number";
      name: string;
      doc: string;
      required?: boolean;
      default?: unknown;
      positional?: boolean;
      complete?: ParamComplete;
    }
  | {
      kind: "enum";
      name: string;
      doc: string;
      values: readonly string[];
      required?: boolean;
      default?: string;
      positional?: boolean;
      complete?: ParamComplete;
    }
  | {
      kind: "string[]";
      name: string;
      doc: string;
      required?: boolean;
      positional?: boolean;
      complete?: ParamComplete;
    };

/** The three output modes every verb must render. */
export interface Formatters<T> {
  readonly plain: (d: T) => string;
  readonly llm: (d: T) => string;
  readonly json: (d: T) => string;
}

/** A usage example shown in verb help. */
export interface Example {
  readonly cmd: string;
  readonly note?: string;
}

/** Progressive-disclosure levels a verb honours, and its default. */
export interface DisclosureSpec {
  readonly levels: readonly string[];
  readonly default: string;
}

/** A documented error a verb may raise, for help and the covenant. */
export interface ErrorSpec {
  readonly code: string;
  readonly when: string;
}

/**
 * A single verb: the atom the projectors consume.
 *
 * `run` is the effect seam — a read returns `Promise<R>`; a mutation returns a
 * `Task<R>` the dispatcher interprets under the node / dry-run interpreters. A
 * mutation that needs async setup before its effects are known (e.g.
 * `sources update` resolves and builds before locking) actually returns a
 * `Promise<Task<R>>`, which the dispatcher and MCP handler both `await` into a
 * `Task<R>` before interpreting. That third shape is presented through the
 * `Task<R>` arm by a cast at the one call site (`update.verb.ts`): adding a
 * literal `Promise<Task<R>>` arm here poisons the contextual inference of every
 * async read verb (they widen to `Promise<R | Task<R>>`), so the union is kept
 * at two arms and the async-setup case carries an honest, commented cast.
 */
export interface VerbSpec<P = Record<string, unknown>, R = unknown> {
  readonly path: readonly [noun: string, verb?: string];
  readonly summary: string;
  readonly doc?: string;
  readonly params: readonly ParamSpec[];
  readonly output: { schema?: unknown; formatters: Formatters<R> };
  readonly examples?: readonly Example[];
  readonly disclosure?: DisclosureSpec;
  readonly capability: Capability;
  readonly run: (p: P, rt: PragmaRuntime) => Promise<R> | Task<R>;
  readonly errors?: readonly ErrorSpec[];
  readonly hidden?: boolean;
}

/**
 * An MCP resource provider — the ONE non-tool projection a module may add.
 *
 * `register` installs a `{+uri}` resource template on the server (listing +
 * autocomplete are storeless over the pack index; a read is store-backed and
 * shares the CLI's entity reader). Resources are NOT tools, so they never enter
 * the emitted tool surface; the projector calls this per module that declares it.
 */
export interface McpResourceProvider {
  readonly register: (
    server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
    rt: PragmaRuntime,
  ) => void;
  /**
   * A static declaration of the resource template ids this provider installs
   * (e.g. `["pragma:{+uri}"]`). The surface emitter projects it into
   * `mcpSurface.resources` so the covenant freezes the non-tool surface without
   * booting a server — the single authoring point, so the id cannot drift.
   */
  readonly surface?: { readonly templates: readonly string[] };
}

/**
 * An MCP prompt provider — a module's native `prompts/*` surface.
 *
 * Parallel to {@link McpResourceProvider}: `register` installs the server's
 * `prompts/list` + `prompts/get` handlers (and advertises the `prompts`
 * capability). Listing is storeless over the pack index; a get is store-backed.
 * Prompts are NOT tools, so they never enter the emitted tool surface; the
 * projector calls this per module that declares it. Async because it
 * dynamic-imports the SDK request schemas (kept off the fast path).
 */
export interface McpPromptProvider {
  readonly register: (
    server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
    rt: PragmaRuntime,
  ) => Promise<void> | void;
}

/** A capability module: a named bundle of verbs with optional boot/resources/prompts hooks. */
export interface CapabilityModule {
  readonly name: string;
  readonly verbs: readonly VerbSpec[];
  readonly boot?: (rt: PragmaRuntime) => void;
  /** An optional MCP resource surface (NOT a VerbSpec field — a module hook). */
  readonly mcpResources?: McpResourceProvider;
  /** An optional MCP prompt surface (NOT a VerbSpec field — a module hook). */
  readonly mcpPrompts?: McpPromptProvider;
}
