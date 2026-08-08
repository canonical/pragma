/**
 * Surface emitter: project capability modules into the machine-readable
 * surface document that the covenant (`surface/covenant.json`) freezes.
 *
 * The emitter is pure and zod-free so it sits on the `--help`/`__complete`
 * fast path. It reads only the grammar — never a run body — and merges in the
 * fixed kernel sections that describe the invariant contract (bins, flags,
 * envelope, exit codes, budgets, ...). Hidden verbs are excluded.
 */

import {
  BIN_NAME,
  DETAIL_LEVELS,
  PROJECT_CONFIG_FILENAME,
} from "../../constants.js";
import type { CapabilityModule, ParamSpec, VerbSpec } from "./types.js";

/** kebab-case a camelCase param name for its flag form (`fullUris` -> `full-uris`). */
export function kebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** The MCP tool name for a verb path (`["config","show"]` -> `config_show`). */
export function toolName(path: readonly [string, string?]): string {
  const [noun, verb] = path;
  return verb ? `${noun}_${verb}` : noun;
}

/** The verb label within its noun (last path segment; the noun itself when self-verb). */
export function verbLabel(path: readonly [string, string?]): string {
  return path[1] ?? path[0];
}

/** One verb as it appears in the surface document. Optional fields omitted when falsy/default. */
export interface EmittedVerb {
  readonly v: string;
  readonly args?: readonly string[];
  readonly flags?: readonly string[];
  readonly mutates?: true;
  readonly needsStore?: true;
  readonly mcp?: string | false;
  readonly note?: string;
}

/**
 * The MCP surface the covenant freezes: the tool set PLUS the non-tool surfaces
 * (PR7 covenant extension). `resources` are the resource template ids providers
 * declare; `prompts` marks whether any module offers the native `prompts/*`
 * surface; `instructions` marks that the server carries handshake instructions
 * (always true — buildServer sets it unconditionally). Prompt NAMES are graph
 * DATA, not grammar, so they are guarded by the prompt tests, not frozen here.
 */
export interface McpSurface {
  readonly tools: string[];
  readonly resources: string[];
  readonly prompts: boolean;
  readonly instructions: boolean;
}

/** The full surface document: live nouns/tools plus the fixed kernel sections. */
export interface EmittedSurface {
  readonly nouns: Record<string, { verbs: EmittedVerb[] }>;
  readonly mcpSurface: McpSurface;
  readonly bins: typeof FIXED_SURFACE.bins;
  readonly globalFlags: typeof FIXED_SURFACE.globalFlags;
  readonly detailLevels: typeof FIXED_SURFACE.detailLevels;
  readonly envelope: typeof FIXED_SURFACE.envelope;
  readonly exitCodes: typeof FIXED_SURFACE.exitCodes;
  readonly mutationContract: typeof FIXED_SURFACE.mutationContract;
  readonly completion: typeof FIXED_SURFACE.completion;
  readonly configFiles: typeof FIXED_SURFACE.configFiles;
  readonly budgets: typeof FIXED_SURFACE.budgets;
}

/**
 * The invariant kernel contract, merged into every emitted surface and frozen
 * verbatim in the covenant. This is the single authoring point — the golden
 * embeds a copy and conformance deep-equals the two, so drift is caught.
 */
export const FIXED_SURFACE = {
  bins: {
    [BIN_NAME]: `${BIN_NAME} CLI and MCP server host (stdio)`,
  },
  globalFlags: [
    {
      flag: "--format <plain|llm|json>",
      doc: "Select output format (llm = condensed Markdown for agents)",
    },
    { flag: "--verbose", doc: "Diagnostic output on stderr" },
    {
      flag: "--detail <level>",
      doc: `Progressive-disclosure level (${DETAIL_LEVELS.join(", ")})`,
    },
  ],
  // Projected, not re-typed, and `config/schema.ts` now validates a declared
  // `detail` against the same tuple — so the covenant, the validator and the
  // renderer cannot disagree. Moves zero covenant bytes.
  //
  // This was originally called the last unguarded copy of the tuple. It was the
  // last copy as DATA; four PROSE writings still spelled the levels by hand,
  // one of them the `--detail` `doc` four lines up, frozen into this same
  // covenant entry beside the projection. All four are composed from
  // `DETAIL_LEVELS` now — the `doc` above, `project/cli/rootHelp.ts`'s
  // `--help` table, and two in `spec/emitReference.ts` (the commands page's
  // global-flags line and the `detail` config row's Type column). Every one
  // emits the identical bytes it did, so nothing in the covenant or the
  // reference moved; what changed is that editing the tuple now moves them, and
  // the surface-conformance and byte-drift guards see it.
  detailLevels: DETAIL_LEVELS,
  envelope: {
    success: { ok: true, data: "<payload>", meta: "<object>" },
    error: {
      ok: false,
      error: {
        code: "<ErrorCode>",
        message: "<string>",
        suggestions: "string[]?",
        recovery: "Recovery?",
        validOptions: "string[]?",
        filters: "object?",
      },
    },
  },
  exitCodes: {
    "0": "success",
    "1": "runtime (entity-not-found, empty, config, internal)",
    "2": "usage (invalid/ambiguous input, unknown verb)",
    "3": "store unavailable",
  },
  mutationContract: {
    cli: { dryRun: "--dry-run", undo: "--undo", confirm: "--yes" },
    mcp: {
      planFirst: true,
      confirmParam: "confirm",
      planMeta: { planOnly: true, confirmRequired: true },
    },
  },
  completion: {
    static: "shell script tier emitted by `setup completions`",
    dynamic: "hidden `__complete` resolver, storeless",
    paramSource: "ParamSpec.complete",
  },
  configFiles: {
    project: `${PROJECT_CONFIG_FILENAME} (evaluated, content-hash cached)`,
    global: `$XDG_CONFIG_HOME/${BIN_NAME}/config.json`,
    // Named `configCache` because that is what it is: the evaluated project
    // config's content-addressed cache. It was called `lock` for a project lock
    // file that no longer exists.
    configCache: `$XDG_STATE_HOME/${BIN_NAME}/config-cache/<sha256>.json`,
    defaults: "built-in defaults.ts",
  },
  budgets: {
    $comment:
      "help/complete/warmStoreVerb are designed aspirations; the ENFORCED ceilings (budgets.test.ts) are 130ms help / 100ms complete / 500ms warmStoreVerb, each derived from measurement on the build hardware and recorded in BUDGETS.md. Designed-aspiration vs enforced-measured. warmStoreVerb joined this list when the embedded pack became the distribution's real graph rather than a sample, which puts the reference box's projected p95 over the designed 300ms; BUDGETS.md carries the arithmetic.",
    help: "<50ms",
    complete: "<50ms",
    projectConfigLoad: "<10ms",
    warmStoreVerb: "<300ms",
    mcpP95Warm: "<100ms",
    condensedSDL: "<=8000 tokens",
  },
} as const;

/**
 * Format a positional param as its usage token (`<name>` required, `[name]`
 * optional, `...` variadic).
 *
 * THE ONE HOME for this rule, and for {@link formatFlagToken} beside it. Both bodies
 * existed three and two times over — here, in `project/cli/verbHelp.ts` and in
 * `project/cli/buildProgram.ts`, the last pair under two different names
 * (`flagSpec`/`flagDisplay`) for byte-identical code. They are here rather than
 * in either caller because this is where the shape they render is DEFINED: the
 * emitted surface is what the covenant freezes, so a token the emitter writes
 * and the help renders must be one rule or the two can disagree about a
 * published argument shape. Both callers already imported {@link kebabCase}
 * from this module, so consolidating adds no edge to either fast-path graph.
 *
 * @param param - The positional param to render.
 * @returns Its usage token.
 */
export function formatPositionalToken(param: ParamSpec): string {
  const variadic = param.kind === "string[]" ? "..." : "";
  return param.required
    ? `<${param.name}${variadic}>`
    : `[${param.name}${variadic}]`;
}

/**
 * Format a non-positional param as its flag token (`--kebab`, `--kebab <value>`,
 * `--kebab <values...>`).
 *
 * Serves both readings that used to have their own copy: Commander's option
 * spec string and the help block's flag column. They were never allowed to
 * differ — a flag Commander accepts and help does not print is a flag a user
 * cannot find — so one name says so.
 *
 * @param param - The non-positional param to render.
 * @returns Its flag token.
 */
export function formatFlagToken(param: ParamSpec): string {
  const flag = `--${kebabCase(param.name)}`;
  if (param.kind === "boolean") return flag;
  if (param.kind === "string[]") return `${flag} <values...>`;
  return `${flag} <value>`;
}

/** Project one verb into its surface entry, omitting default/falsy fields. */
export function emitVerb(verb: VerbSpec): EmittedVerb {
  const positionals = verb.params.filter((p) => p.positional);
  const flags = verb.params.filter((p) => !p.positional);

  const entry: {
    v: string;
    args?: string[];
    flags?: string[];
    mutates?: true;
    needsStore?: true;
    mcp?: string | false;
  } = { v: verbLabel(verb.path) };

  if (positionals.length > 0) entry.args = positionals.map(formatPositionalToken);
  if (flags.length > 0)
    entry.flags = flags.map((p) => `--${kebabCase(p.name)}`);
  if (verb.capability.mutates) entry.mutates = true;
  if (verb.capability.needsStore) entry.needsStore = true;
  entry.mcp = verb.capability.mcp.expose ? toolName(verb.path) : false;

  return entry;
}

/**
 * Emit the full surface document for a set of capability modules.
 *
 * @param modules - The capability modules to project.
 * @returns The surface document: live nouns + sorted tools + fixed sections.
 */
export function emitSurface(
  modules: readonly CapabilityModule[],
): EmittedSurface {
  const nouns: Record<string, { verbs: EmittedVerb[] }> = {};
  const tools: string[] = [];
  const resources: string[] = [];
  let prompts = false;

  for (const module of modules) {
    for (const verb of module.verbs) {
      const noun = verb.path[0];
      const bucket = nouns[noun] ?? { verbs: [] };
      nouns[noun] = bucket;
      bucket.verbs.push(emitVerb(verb));
      if (verb.capability.mcp.expose) tools.push(toolName(verb.path));
    }
    // Non-tool MCP surfaces (module hooks, NOT verbs): the resource template ids
    // the provider declares, and whether a native prompt surface is offered.
    if (module.mcpResources?.surface) {
      resources.push(...module.mcpResources.surface.templates);
    }
    if (module.mcpPrompts) prompts = true;
  }

  return {
    nouns,
    mcpSurface: {
      tools: tools.sort(),
      resources: resources.sort(),
      prompts,
      // The server always carries handshake instructions (buildServer sets them
      // unconditionally), so this is an invariant true — a stable presence marker.
      instructions: true,
    },
    bins: FIXED_SURFACE.bins,
    globalFlags: FIXED_SURFACE.globalFlags,
    detailLevels: FIXED_SURFACE.detailLevels,
    envelope: FIXED_SURFACE.envelope,
    exitCodes: FIXED_SURFACE.exitCodes,
    mutationContract: FIXED_SURFACE.mutationContract,
    completion: FIXED_SURFACE.completion,
    configFiles: FIXED_SURFACE.configFiles,
    budgets: FIXED_SURFACE.budgets,
  };
}
