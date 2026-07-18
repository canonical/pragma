/**
 * Surface emitter: project capability modules into the machine-readable
 * surface document that the covenant (`surface/surface.v2.json`) freezes.
 *
 * The emitter is pure and zod-free so it sits on the `--help`/`__complete`
 * fast path. It reads only the grammar — never a run body — and merges in the
 * fixed kernel sections that describe the invariant contract (bins, flags,
 * envelope, exit codes, budgets, ...). Hidden verbs are excluded.
 */

import type { CapabilityModule, ParamSpec, VerbSpec } from "./types.js";

/** kebab-case a camelCase param name for its flag form (`allTiers` -> `all-tiers`). */
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

/** The full surface document: live nouns/tools plus the fixed kernel sections. */
export interface EmittedSurface {
  readonly nouns: Record<string, { verbs: EmittedVerb[] }>;
  readonly mcpSurface: { tools: string[] };
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
    pragma2: "pragma v2 CLI and MCP server host (stdio)",
  },
  globalFlags: [
    { flag: "--llm", doc: "Condensed Markdown output for agents" },
    { flag: "--format <json|plain>", doc: "Select output format" },
    { flag: "--verbose", doc: "Diagnostic output on stderr" },
    { flag: "--detail <level>", doc: "Progressive-disclosure level" },
  ],
  detailLevels: ["summary", "standard", "detailed"],
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
    project: "pragma.config.ts (evaluated, content-hash cached)",
    global: "$XDG_CONFIG_HOME/pragma/config.json",
    lock: "$XDG_STATE_HOME/pragma/config-cache/<sha256>.json",
    defaults: "built-in defaults.ts",
  },
  budgets: {
    $comment:
      "help/complete are the designed <50ms aspiration; the ENFORCED ceilings (budgets.test.ts) are 130ms help / 100ms complete — ~2× the measured median on the build hardware, recorded in BUDGETS.md. Designed-aspiration vs enforced-measured.",
    help: "<50ms",
    complete: "<50ms",
    projectConfigLoad: "<10ms",
    warmStoreVerb: "<300ms",
    mcpP95Warm: "<100ms",
    condensedSDL: "<=8000 tokens",
  },
} as const;

/** Format a positional param as its usage token (`<name>` required, `[name]` optional). */
function positionalToken(param: ParamSpec): string {
  const variadic = param.kind === "string[]" ? "..." : "";
  return param.required
    ? `<${param.name}${variadic}>`
    : `[${param.name}${variadic}]`;
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

  if (positionals.length > 0) entry.args = positionals.map(positionalToken);
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
 * @param modules - The capability modules to project (hidden verbs excluded).
 * @returns The surface document: live nouns + sorted tools + fixed sections.
 */
export function emitSurface(
  modules: readonly CapabilityModule[],
): EmittedSurface {
  const nouns: Record<string, { verbs: EmittedVerb[] }> = {};
  const tools: string[] = [];

  for (const module of modules) {
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      const noun = verb.path[0];
      const bucket = nouns[noun] ?? { verbs: [] };
      nouns[noun] = bucket;
      bucket.verbs.push(emitVerb(verb));
      if (verb.capability.mcp.expose) tools.push(toolName(verb.path));
    }
  }

  return {
    nouns,
    mcpSurface: { tools: tools.sort() },
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
