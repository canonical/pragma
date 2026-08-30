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

import type { Effect, Task } from "@canonical/task";
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
      /**
       * A repeatable flag ACCUMULATES: `--category css --category git` is
       * the union, never last-wins (repetition is the sanctioned multi-value
       * form, and silently dropping all but the last value is data loss).
       * CLI-side only: the MCP arg schema keeps its scalar shape, and the
       * run body accepts one value or many.
       */
      repeatable?: true;
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
      /** See the string variant — repeated occurrences accumulate. */
      repeatable?: true;
    }
  | {
      kind: "string[]";
      name: string;
      doc: string;
      required?: boolean;
      positional?: boolean;
      complete?: ParamComplete;
    };

/**
 * The three output modes every verb must render.
 *
 * `plain` takes an optional {@link RenderContext} — the dispatcher's
 * presentation facts (`--no-headers`, whether stdout is a terminal). Only
 * list-shaped formatters read it; `llm` (the byte-frozen agent contract) and
 * `json` (the envelope) never see it.
 *
 * `notice` is the seam for what the DATA cannot say about itself. Return the
 * calm sentence when the payload would otherwise misrepresent the read; return
 * `undefined` (or omit the member) when it speaks for itself.
 *
 * Two shapes qualify, and they are the same failure. A zero-record result
 * ("empty ≠ silence"): an unbuilt store, a mistyped filter and a genuinely empty
 * result were all `{"ok":true,"data":[],"meta":{}}`. And a result that is one of
 * several it could have been — a `lookup` whose name reached more entities than
 * the one it answers with. A caller shown Launchpad's `Button` has no way to
 * discover the global one from a payload that looks exactly like an unambiguous
 * hit; the notice names the IRIs the answer did not take, which is the only
 * address that reaches them.
 *
 * It was called `emptyNotice` while emptiness was the only case. The channel is
 * unchanged — same key, same three surfaces — so this is one seam covering both,
 * not a second one grown beside it.
 *
 * Three surfaces route it, each in its own register — it is one seam, not a
 * plain-mode courtesy:
 * - `plain`: the dispatcher writes it to STDERR with exit 0, keeping the stdout
 *   data stream free of human sentences a pipe would read as records. `--quiet`
 *   mutes it (success-path guidance).
 * - `--format json` AND the MCP tool result: it rides the envelope as
 *   `meta.notice` (`project/cli/dispatch.ts#renderData`,
 *   `project/mcp/registerVerb.ts#emptyMeta` — the same key from the same seam,
 *   so the two MACHINE surfaces stay byte-equal). `data` keeps its uniform empty
 *   shape; `[]` stays `[]`. Without it an agent could not tell an unbuilt store,
 *   a mistyped filter and a genuinely empty result apart — all three were
 *   `{"ok":true,"data":[],"meta":{}}`.
 * - `llm` (the byte-frozen agent contract) is the ONE mode that still ignores
 *   it: it renders one stream and its bytes are frozen.
 *
 * The formatters themselves never see the notice: `json(d)` renders the data
 * alone, and the ENVELOPE layer carries the notice beside it.
 */
export interface Formatters<T> {
  readonly plain: (
    d: T,
    context?: import("../render/contracts.js").RenderContext,
  ) => string;
  readonly llm: (d: T) => string;
  readonly json: (d: T) => string;
  readonly notice?: (d: T) => string | undefined;
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
  readonly output: {
    schema?: unknown;
    formatters: Formatters<R>;
    /**
     * OPTIONAL dry-run seam. A `--dry-run` normally renders the raw effect
     * dump — one `describeEffect` bullet per effect, absolute paths repeated
     * per line, interpreter internals included — which is debug material, not a
     * preview a user was meant to read. A verb that has stashed structured plan
     * data on the runtime (`PragmaRuntime.planData`) can render that instead.
     *
     * ABSENT BY DEFAULT, and absent is exactly today's render: a verb that does
     * not declare this is untouched. The honest preview still runs underneath
     * either way, so a dry run still fails exactly when the run would.
     *
     * The previewed `effects` and the run's verbosity arrive BESIDE the stashed
     * data, because a plan is not always known before the Task runs: `setup`
     * computes its target table up front and renders that, while `create` has
     * nothing to stash — its plan IS the effects the generator produced, which
     * only exist once the preview interpreter has walked the Task. One seam
     * serves both by handing the renderer everything the branch knows.
     *
     * MAY be async: a renderer whose formatting rules live in another package
     * loads them behind a dynamic `import()` rather than putting them on the
     * capabilities barrel's static graph, which every `--help` and
     * `__complete` spawn pays for. The kernel awaits whatever it returns.
     */
    formatPlan?: (
      planData: unknown,
      effects: readonly Effect[],
      verbose: boolean,
    ) => string | Promise<string>;
  };
  readonly examples?: readonly Example[];
  readonly disclosure?: DisclosureSpec;
  readonly capability: Capability;
  readonly run: (p: P, rt: PragmaRuntime) => Promise<R> | Task<R>;
  readonly errors?: readonly ErrorSpec[];
  readonly hidden?: boolean;
}

/**
 * One slice of the index a module contributes to the MCP resource listing.
 *
 * Deliberately the vocabulary of {@link CompletionSourceRef} — a listing and a
 * completion address the same index by the same three facts (which type, which
 * box, what to yield), and a second vocabulary for that would be a second
 * writing of one decision. The only source a listing can read is the index, so
 * `from` is implied and absent.
 */
export interface McpListableRef {
  /** Prefixed type filter (e.g. `ds:Component`) — empty = any type. */
  readonly type?: string;
  /** Restrict to schema (`tbox`) or individuals (`abox`); empty = both. */
  readonly box?: "tbox" | "abox";
  /**
   * What the slice yields: `"collection"` lists ONE entry — the class entry
   * for {@link type}, carrying its instance count — while `"entities"` lists
   * every matching entity. Default `"entities"`.
   */
  readonly as?: "collection" | "entities";
  /**
   * Relative importance, 0–1 (default 1). Feeds MCP `annotations.priority` on
   * the listed resource AND breaks ties in URI-completion ranking, so the two
   * judgements about what matters most are ONE declaration rather than two
   * constants in the kernel.
   */
  readonly weight?: number;
}

/**
 * A module's declared contribution to the MCP resource listing.
 *
 * The listing is the UNION of every module's slices. It exists because
 * `resources/list` has no working pagination in the SDK (the high-level
 * `McpServer` list handler ignores `request.params.cursor` and never returns
 * `nextCursor`), so the listing is curated rather than paged: every byte it
 * spends on connect is context the agent cannot spend on the task.
 *
 * DERIVED wherever the module is compiled from a read story — a story already
 * declares the type set it addresses (`PackLookup.type`/`types`), so its
 * listing is read off that declaration, never authored a second time.
 */
export interface McpListable {
  readonly sources: readonly McpListableRef[];
}

/**
 * An MCP resource provider — the ONE non-tool projection a module may add.
 *
 * `register` installs a `{+uri}` resource template on the server (listing +
 * autocomplete are storeless over the pack index; a read is store-backed and
 * shares the CLI's entity reader). Resources are NOT tools, so they never enter
 * the emitted tool surface; the projector calls this per module that declares it.
 *
 * `register` receives the WHOLE effective module set, not just its own module:
 * the listing a provider installs is the union of every module's
 * {@link McpListable}, which no single module can see.
 */
export interface McpResourceProvider {
  readonly register: (
    server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
    rt: PragmaRuntime,
    modules: readonly CapabilityModule[],
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

/** A flag a mounted subcommand offers to completion (full `--token`). */
export interface CompletionChildFlag {
  /** The full flag token (`--no-with-styles`). */
  readonly flag: string;
  /** Whether the flag consumes a value. */
  readonly takesValue: boolean;
  /** Closed value set for the flag's value, when one exists. */
  readonly values?: readonly string[];
}

/** A positional slot a mounted subcommand offers to completion. */
export interface CompletionChildPositional {
  /** The slot name (diagnostics only). */
  readonly name: string;
  /** Whether the positional is required. */
  readonly required: boolean;
  /** Closed value set (e.g. tree segments), when one exists. */
  readonly values?: readonly string[];
  /** True when the slot completes file paths natively. */
  readonly files?: boolean;
}

/**
 * The completion surface of one MOUNTED command node: its flags, its
 * positional slots, and any deeper segment children — static data (it must
 * pass the completion safety allowlist), never live module state.
 */
export interface CompletionChildSpec {
  /** The command token at this node. */
  readonly label: string;
  /** Flags offered at this node. */
  readonly flags: readonly CompletionChildFlag[];
  /** Positional slots at this node, in order. */
  readonly positionals: readonly CompletionChildPositional[];
  /** Deeper segment children (each with its own flags/positionals/children). */
  readonly children?: readonly CompletionChildSpec[];
}

/**
 * The REGISTERED CLI spelling of one mounted verb — the single syntax seam
 * every kernel emitter and gate consumes: the reference emitter (usage line
 * + Args/Flags tables), `emitSurface` (the covenant's mounted-noun flag and
 * positional tokens, L-CIS-2), and the `docExamples` gate's valid-token
 * vocabulary. A mounted tree may register a different surface than the
 * binding-level params suggest (tree segments as subcommands, a
 * default-true boolean registered only as its `--no-` form), and all three
 * surfaces must print what the CLI actually accepts — the module supplies
 * it, the kernel renders it.
 */
export interface ReferenceCliSyntax {
  /**
   * The usage line after the bin name (e.g.
   * `create application react [app-path] [options]`) — real tree segments,
   * the registered positional token.
   */
  readonly usage: string;
  /**
   * The registered flag token per binding-level param name (e.g.
   * `withStyles` → `--no-with-styles`). A param absent here renders with the
   * default `--<kebab-name>` derivation.
   */
  readonly flagTokens: Readonly<Record<string, string>>;
  /**
   * The registered positional token per binding-level param name (e.g.
   * `componentPath` → `[component-path]`) — the SAME token the usage line
   * carries, so the Arguments table never contradicts its own synopsis. A
   * param absent here renders with the default `<name>`/`[name]` derivation.
   */
  readonly positionalTokens?: Readonly<Record<string, string>>;
}

/** What the program hands a module mounting its own subtree. */
export interface CliMountHost {
  /** Global flags for this invocation (closed over by mounted actions). */
  readonly globalFlags: import("../runtime/types.js").GlobalFlags;
  /** The binary name (for messages the mounted tree prints). */
  readonly programName: string;
}

/**
 * A module-level CLI projection hook (precedented by `mcpResources`/
 * `mcpPrompts`/`colophon` — module metadata, NOT a `VerbSpec` field, zero
 * covenant impact): the module MOUNTS its noun's subtree onto the Commander
 * parent itself, instead of the generic per-verb attachment. The module's
 * verbs remain the binding-level grammar (surface, MCP, reference,
 * completion labels); the mount owns everything beneath the noun.
 */
export interface CliProjection {
  /**
   * Load the mount's registration machinery, when it is deferred. The
   * projection hook rides the capabilities barrel, which `--help` and
   * `__complete` import on every spawn — so a mount whose registration needs
   * heavy modules (a Commander adapter, shared decision logic) keeps them
   * behind this async step instead of a static import, and only the one
   * caller that actually builds the command tree (the bin, before
   * `buildProgram`) awaits it. {@link mount} stays synchronous and throws
   * when invoked unprepared, so a future caller cannot silently skip the
   * step.
   */
  readonly prepare?: () => Promise<void>;
  /** Populate this module's noun parent with its subcommands. */
  readonly mount: (
    parent: import("commander").Command,
    host: CliMountHost,
  ) => void;
  /**
   * The completion surface of the mounted tree, keyed by verb label —
   * static data the completion model attaches as segment children.
   */
  readonly completionChildren: () => Readonly<
    Record<string, CompletionChildSpec>
  >;
  /** Markdown inserted under the noun's heading in the generated reference. */
  readonly referenceIntro?: string;
  /**
   * The registered CLI syntax for one of the noun's binding verbs — the
   * MOUNTED spelling the reference must print (usage line with tree
   * segments, flag tokens the CLI actually registers) instead of deriving
   * tokens from binding-level param names the mounted tree may not register.
   * Return `undefined` to keep the default rendering for that verb.
   */
  readonly referenceSyntax?: (
    verbPath: VerbSpec["path"],
  ) => ReferenceCliSyntax | undefined;
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
   * `kernel/packs/collect.validateStories`). Set where a story is compiled
   * (`capabilities/distribution.ts` and the three composite nouns), read once,
   * by `kernel/packs/collect.assembleEffectiveModules`.
   */
  readonly story?: true;
  readonly boot?: (rt: PragmaRuntime) => void;
  /** An optional MCP resource surface (NOT a VerbSpec field — a module hook). */
  readonly mcpResources?: McpResourceProvider;
  /**
   * The slices of the index this module contributes to the MCP resource
   * listing (NOT a VerbSpec field — a module hook, like `mcpResources`). A
   * story-compiled module gets it DERIVED from its lookup's declared types;
   * only an authored module declares it by hand.
   */
  readonly mcpListable?: McpListable;
  /** An optional MCP prompt surface (NOT a VerbSpec field — a module hook). */
  readonly mcpPrompts?: McpPromptProvider;
  /** An optional CLI mount for the module's noun (NOT a VerbSpec field). */
  readonly cliProjection?: CliProjection;
}
