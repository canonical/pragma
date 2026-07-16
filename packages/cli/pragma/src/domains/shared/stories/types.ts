/**
 * Read-story spec types — one declaration per read story, many projections.
 *
 * A read story (list, show, or lookup) is declared once per domain and
 * compiled into both surfaces: a cli-core `CommandDefinition` and a
 * declarative MCP `ToolSpec`. The compilers in this folder own the shared
 * execute skeletons — parameter projection, condensed rendering with token
 * estimates, empty-result guards, and summary projection — so a domain
 * supplies only its facts: descriptions, parameters, resolve function,
 * formatters, and envelope mapping. This kills the per-domain duplication
 * between `commands/*.ts` and `mcp/specs.ts` for read verbs and makes
 * CLI/MCP parity structural instead of conventional.
 */

import type { CommandContext } from "@canonical/cli-core";
import type { PragmaError } from "#error";
import type { LookupResult } from "../contracts.js";
import type { Formatters } from "../formatters.js";
import type { PragmaRuntime } from "../types/index.js";

/** Surfaces a story parameter is projected to (default: "both"). */
export type StorySurface = "both" | "cli" | "mcp";

/**
 * Neutral parameter definition projected to a CLI flag and an MCP tool
 * parameter. `string[]` becomes a CLI multiselect and an MCP string array.
 */
export interface StoryParam {
  readonly name: string;
  readonly type: "string" | "boolean" | "string[]";
  /** CLI help text; also the MCP description unless `toolDescription` is set. */
  readonly description: string;
  /** MCP-specific description override. */
  readonly toolDescription?: string;
  readonly required?: boolean;
  /** CLI default value — MCP parameters carry no defaults. */
  readonly default?: unknown;
  /** Allowed values; projects to CLI select choices and an MCP enum. */
  readonly enum?: readonly string[];
  /** If true, the CLI accepts this parameter as a positional argument. */
  readonly positional?: boolean;
  /** Surfaces this parameter appears on (default: "both"). */
  readonly surfaces?: StorySurface;
  /** CLI tab-completion for this parameter's argument. */
  readonly complete?: (
    partial: string,
    ctx: CommandContext,
  ) => Promise<string[]>;
}

/** MCP envelope fragment produced by a story's `toEnvelope`. */
export interface StoryEnvelope {
  readonly data: unknown;
  readonly meta?: Record<string, unknown>;
}

/**
 * A collection-or-singleton read story (`<noun> list`, `<noun> show`).
 *
 * `TData` is the domain's resolved payload; `TOutput` is the formatter and
 * renderer input derived from it via `toOutput`.
 */
export interface ReadStory<TData, TOutput> {
  readonly noun: string;
  /** Read verb this story projects to (e.g. "list", "show"). */
  readonly verb: string;
  /** CLI one-line help description. */
  readonly description: string;
  /** MCP tool description. */
  readonly toolDescription: string;
  readonly params: readonly StoryParam[];
  /** Usage examples shown in CLI help. */
  readonly examples: readonly string[];
  /** Fetch the story's data. Shared verbatim by both surfaces. */
  readonly resolve: (
    rt: PragmaRuntime,
    params: Record<string, unknown>,
  ) => Promise<TData>;
  /** Map resolved data to the formatter/renderer input. */
  readonly toOutput: (data: TData, params: Record<string, unknown>) => TOutput;
  readonly formatters: Formatters<TOutput>;
  /** Map resolved data to the MCP `{ data, meta }` envelope. */
  readonly toEnvelope: (data: TData) => StoryEnvelope;
  /**
   * CLI-only pre-resolve guard: return an error to reject invalid
   * parameters (e.g. an empty required positional).
   */
  readonly guardParams?: (
    params: Record<string, unknown>,
  ) => PragmaError | undefined;
  /**
   * CLI-only post-resolve guard: return an error to reject an empty
   * result set with a recovery hint.
   */
  readonly emptyError?: (
    data: TData,
    params: Record<string, unknown>,
  ) => PragmaError | undefined;
  /** Optional interactive (ink) renderer for the CLI. */
  readonly renderInk?: (output: TOutput) => unknown;
}

/** Per-invocation view state passed to lookup story hooks. */
export interface LookupStoryView {
  readonly surface: "cli" | "mcp";
  /** Effective detail level after surface defaults and flag implications. */
  readonly detailed: boolean;
  readonly params: Record<string, unknown>;
}

/**
 * A batch retrieval story (`<noun> lookup <names...>`).
 *
 * `TDetailed` is the looked-up entity; `TFmtInput` is the per-entity
 * formatter input derived via `toFmtInput` (some domains pair the entity
 * with view flags such as `detailed` or aspect selections).
 */
export interface LookupStory<TDetailed, TFmtInput> {
  readonly noun: string;
  readonly description: string;
  readonly toolDescription: string;
  /** CLI description of the `names` positional parameter. */
  readonly namesDescription: string;
  /** MCP-specific `names` description override. */
  readonly namesToolDescription?: string;
  /** CLI tab-completion for names. */
  readonly complete?: (
    partial: string,
    ctx: CommandContext,
  ) => Promise<string[]>;
  /**
   * The `detailed` toggle, when the story supports one. MCP defaults
   * `detailed` to true; the CLI defaults it to false.
   */
  readonly detailedParam?: {
    readonly description: string;
    readonly toolDescription?: string;
  };
  /** Additional story parameters beyond `names` and `detailed`. */
  readonly params?: readonly StoryParam[];
  /** Named groups for organizing CLI parameters in help output. */
  readonly parameterGroups?: Readonly<Record<string, readonly string[]>>;
  readonly examples: readonly string[];
  /**
   * Resolve all queries, collecting per-query failures.
   *
   * The compilers pass the per-invocation `view` so surface-sensitive
   * resolution (e.g. pack disclosure defaults, which differ between the
   * CLI and MCP per the ratified surface contract) can see which surface
   * is calling; most stories ignore it.
   */
  readonly resolve: (
    rt: PragmaRuntime,
    names: readonly string[],
    params: Record<string, unknown>,
    view?: LookupStoryView,
  ) => Promise<LookupResult<TDetailed>>;
  /**
   * Effective `detailed` for a surface. Defaults to the plain flag value
   * (CLI: false unless set; MCP: true unless set). Domains override this
   * when other flags imply detail (e.g. block aspect filters).
   */
  readonly resolveDetailed?: (
    surface: "cli" | "mcp",
    params: Record<string, unknown>,
  ) => boolean;
  /** Map an entity to the per-entity formatter input. */
  readonly toFmtInput: (entity: TDetailed, view: LookupStoryView) => TFmtInput;
  readonly formatters: Formatters<TFmtInput>;
  /** MCP summary projection applied when `detailed` is false. */
  readonly project?: (entity: TDetailed) => unknown;
  /** CLI-only error thrown when no names are supplied. */
  readonly emptyNamesError?: () => PragmaError;
  /** Optional interactive (ink) renderer for the CLI. */
  readonly renderInk?: (
    result: LookupResult<TDetailed>,
    view: LookupStoryView,
  ) => unknown;
}
