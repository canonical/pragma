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
 *
 * Every name here is exported, including the ones no other file names
 * today: this is the domain's type file, so its members ARE the surface,
 * and each unnamed one composes a shape that IS read elsewhere. A
 * stray-export scan will flag them; that is a false positive, not residue.
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
export type CompletionFrom = "index" | "skills" | "prefixes";

/**
 * Which of an index entity's name-bearing fields a param completes against.
 * The kernel knows no entity families — a family is a `type` filter plus the
 * field that family is addressed by, both declared at the verb.
 */
export type CompletionField = "name" | "label" | "altNames";

/** A reference to one name source: where from, and which field of it. */
export interface CompletionSourceRef {
  /** Which storeless source to read candidate names from. */
  readonly from: CompletionFrom;
  /** Prefixed type filter — meaningful only for `from: "index"` (empty = any). */
  readonly type?: string;
  /**
   * Which field the candidates come from — `from: "index"` only, default
   * `"name"`. Declare the field the verb's lookup MATCHES on: `label` and
   * `altNames` are optional index enrichment, and an entity carrying neither
   * contributes no candidate rather than a token the lookup would refuse.
   */
  readonly field?: CompletionField;
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
 * `Task<R>` the dispatcher interprets under the node, plan, or undo
 * interpreters (`--yes`, `--dry-run`, `--undo` — `dispatch.ts`'s own docblock
 * names the same three). A
 * mutation that needs async setup before its effects are known (e.g.
 * `sources update` resolves and builds before pointing the project at the pack)
 * actually returns a
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
  /**
   * Optional Markdown narrating how this module's domain is made — surfaced by
   * `pragma colophon`. Module-level metadata (like `boot`/`mcpResources`/
   * `mcpPrompts`), NOT a `VerbSpec` field, so `emitSurface` never reads it and
   * it has zero covenant impact.
   */
  readonly colophon?: string;
  /**
   * This module was compiled — wholly or in part — from a declared read story,
   * so a story in the user's own CONFIG for the same noun REPLACES it. Authored
   * modules (config, ontology, doctor, …) carry no story and can never be
   * replaced; neither can any shipped noun be replaced by a PACKAGE story (see
   * `kernel/packs/collect.validateStories`). Set where a story is compiled —
   * `capabilities/distribution.ts` for the distribution's own, and
   * `kernel/packs/collect.ts` for a config- or package-declared one — and read
   * once, by `kernel/packs/collect.assembleEffectiveModules`.
   */
  readonly story?: true;
  readonly boot?: (rt: PragmaRuntime) => void;
  /** An optional MCP resource surface (NOT a VerbSpec field — a module hook). */
  readonly mcpResources?: McpResourceProvider;
  /** An optional MCP prompt surface (NOT a VerbSpec field — a module hook). */
  readonly mcpPrompts?: McpPromptProvider;
}

/**
 * A single stage in the discovery flow an agent follows at session start.
 *
 * Here rather than in `capabilities/capabilities/types.ts`, where it used to
 * live, because `kernel/orientation.ts` builds the sequence and a kernel module
 * may not reach into a capability for its own return type.
 */
export interface DiscoveryStage {
  readonly stage: number;
  readonly tool: string;
  readonly purpose: string;
}
