/**
 * Reference emitter: project the live capability grammar into the committed
 * Markdown reference under `docs/reference/`.
 *
 * A sibling of `emitSurface` — same input (the `CapabilityModule[]` catalog),
 * same discipline: pure, zod-free, and reads ONLY the grammar (never a run
 * body). Where `emitSurface` freezes the machine covenant, this renders the
 * human/agent-facing pages the build hook writes back to disk and the
 * drift-guard (`capabilities/reference.test.ts`) pins byte-for-byte.
 *
 * DETERMINISM is the contract: stable sort, params in declared order, no
 * version, no dates, no `Date.now()` — the same catalog always yields the same
 * bytes, so a rebuild is a no-op and the drift-guard stays green. `doc` strings
 * are kept verbatim (the project-layer `stripToolCallExample` is deliberately
 * NOT imported — this is a kernel-layer emitter).
 */

import { BIN_NAME, PROJECT_CONFIG_FILENAME } from "../../constants.js";
import type { RawConfig } from "../config/types.js";
import { ERROR_CODES } from "../error/constants.js";
import {
  FIXED_SURFACE,
  kebabCase,
  toolName,
  verbLabel,
} from "./emitSurface.js";
import type {
  CapabilityModule,
  Example,
  ParamSpec,
  VerbSpec,
} from "./types.js";

/** The reference doc set: relative path under `docs/reference/` → file content. */
export type ReferenceDocs = ReadonlyMap<string, string>;

/**
 * The closed error-code → one-line meaning map. Typed as an exhaustive
 * `Record` over the `ERROR_CODES` tuple, so a code added to the tuple without a
 * description here is a COMPILE error — the single authoring point stays in
 * lockstep with the error kernel. Colocated (single-use) rather than in
 * `constants.ts`: it is only read by `renderErrorsPage`.
 */
const ERROR_CODE_DESCRIPTIONS: Record<(typeof ERROR_CODES)[number], string> = {
  ENTITY_NOT_FOUND: "A named entity (block, standard, token, …) was not found.",
  EMPTY_RESULTS:
    "A query or listing resolved to nothing under the active scope.",
  INVALID_INPUT: "An argument was malformed, out of range, or the wrong shape.",
  AMBIGUOUS_INPUT:
    "A name resolved to several entities (reserved; not yet raised).",
  UNKNOWN_VERB: "The command noun or verb is not recognized.",
  STORE_UNAVAILABLE: "The local store could not be reached or is not built.",
  CONFIG_ERROR: "The layered configuration could not be resolved.",
  INTERNAL_ERROR: "An unexpected failure — please report it.",
  UNSUPPORTED: "A capability is unavailable in this build or environment.",
};

/** Escape a value for a Markdown table cell (pipes, then newlines to spaces). */
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Flatten every non-hidden verb, sorted by noun ascending then verb-label ascending. */
function collectDocVerbs(
  modules: readonly CapabilityModule[],
): readonly VerbSpec[] {
  const verbs: VerbSpec[] = [];
  for (const module of modules) {
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      verbs.push(verb);
    }
  }
  return verbs.sort(compareDocVerbs);
}

/** Order two verbs by noun, then by verb-label — a total, locale-free order. */
function compareDocVerbs(a: VerbSpec, b: VerbSpec): number {
  const nounA = a.path[0];
  const nounB = b.path[0];
  if (nounA !== nounB) return nounA < nounB ? -1 : 1;
  const labelA = verbLabel(a.path);
  const labelB = verbLabel(b.path);
  /* v8 ignore next -- unreachable: no registered grammar produces a `[noun,
     noun]` path (a verb equal to its own noun), so within one noun every
     verb-label is unique and this equal tie-break never fires. */
  if (labelA === labelB) return 0;
  return labelA < labelB ? -1 : 1;
}

/** The full CLI invocation head for a verb (`<bin> <noun>` or `<bin> <noun> <verb>`). */
function formatInvocation(verb: VerbSpec): string {
  const sub = verb.path[1];
  return sub === undefined
    ? `${BIN_NAME} ${verb.path[0]}`
    : `${BIN_NAME} ${verb.path[0]} ${sub}`;
}

/** Format a positional param as its usage token (`<name>`/`[name]`, `...` when variadic). */
function formatPositionalToken(param: ParamSpec): string {
  const variadic = param.kind === "string[]" ? "..." : "";
  return param.required
    ? `<${param.name}${variadic}>`
    : `[${param.name}${variadic}]`;
}

/** The value placeholder a flag takes (empty for a bare boolean switch). */
function formatFlagValue(param: ParamSpec): string {
  switch (param.kind) {
    case "boolean":
      return "";
    case "enum":
      return `<${param.values.join("|")}>`;
    case "number":
      return "<number>";
    case "string":
      return "<string>";
    case "string[]":
      return "<value...>";
  }
}

/**
 * The tool-schema type label a param projects to (mirrors `buildZodSchema`).
 * Enum values are comma-joined (never pipe-joined) so the label is safe inside
 * a Markdown table cell without escaping.
 */
function formatParamType(param: ParamSpec): string {
  switch (param.kind) {
    case "enum":
      return `enum(${param.values.join(", ")})`;
    case "string[]":
      return "string[]";
    default:
      return param.kind;
  }
}

/** Render a default value for prose (strings verbatim, everything else stringified). */
function formatDefault(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

/** A param's description cell: its doc, plus enum values and any default. */
function describeParam(param: ParamSpec): string {
  let description = escapeCell(param.doc);
  if (param.kind === "enum") {
    description += ` (one of: ${param.values.join(", ")})`;
  }
  if ("default" in param && param.default !== undefined) {
    description += ` (default: ${escapeCell(formatDefault(param.default))})`;
  }
  return description;
}

/** The single-line usage string: invocation + positionals + `[options]`. */
function formatUsage(verb: VerbSpec): string {
  const positionals = verb.params.filter((p) => p.positional);
  const flags = verb.params.filter((p) => !p.positional);
  const segments = [formatInvocation(verb)];
  for (const positional of positionals) {
    segments.push(formatPositionalToken(positional));
  }
  if (flags.length > 0) segments.push("[options]");
  return segments.join(" ");
}

/** The Args table for a verb's positionals, or `""` when it has none. */
function formatArgsTable(params: readonly ParamSpec[]): string {
  const positionals = params.filter((p) => p.positional);
  if (positionals.length === 0) return "";
  const rows = ["| Argument | Required | Description |", "| --- | --- | --- |"];
  for (const param of positionals) {
    const required = param.required ? "yes" : "no";
    rows.push(
      `| \`${formatPositionalToken(param)}\` | ${required} | ${describeParam(param)} |`,
    );
  }
  return `**Arguments**\n\n${rows.join("\n")}`;
}

/** The Flags table for a verb's non-positional params, or `""` when it has none. */
function formatFlagsTable(params: readonly ParamSpec[]): string {
  const flags = params.filter((p) => !p.positional);
  if (flags.length === 0) return "";
  const rows = ["| Flag | Value | Description |", "| --- | --- | --- |"];
  for (const param of flags) {
    // The `<a|b|c>` enum token carries pipes — escape them so the code-span cell
    // does not split the table column.
    const value = formatFlagValue(param);
    const valueCell = value === "" ? "—" : `\`${escapeCell(value)}\``;
    rows.push(
      `| \`--${kebabCase(param.name)}\` | ${valueCell} | ${describeParam(param)} |`,
    );
  }
  return `**Flags**\n\n${rows.join("\n")}`;
}

/** The Examples block for a verb, or `""` when none are declared. */
function formatExamples(examples: readonly Example[] | undefined): string {
  if (!examples || examples.length === 0) return "";
  const lines = ["```bash"];
  for (const example of examples) {
    lines.push(
      example.note ? `${example.cmd}  # ${example.note}` : example.cmd,
    );
  }
  lines.push("```");
  return `**Examples**\n\n${lines.join("\n")}`;
}

/** The Store / Mutation / MCP attribute bullets for one verb. */
function formatVerbAttributes(verb: VerbSpec): string {
  const bullets = [
    verb.capability.needsStore
      ? `- Store: reads the local store (\`${BIN_NAME} sources update\` builds it).`
      : "- Store: storeless.",
  ];
  if (verb.capability.mutates) {
    bullets.push(
      "- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.",
    );
  }
  bullets.push(
    verb.capability.mcp.expose
      ? `- MCP: exposed as the \`${toolName(verb.path)}\` tool.`
      : "- MCP: not exposed (CLI-only).",
  );
  return bullets.join("\n");
}

/** Join page blocks with blank lines, dropping empties, and end in ONE newline. */
function assemblePage(blocks: readonly string[]): string {
  return `${blocks.filter((block) => block.length > 0).join("\n\n")}\n`;
}

/** Render one verb's `commands.md` section (heading through examples). */
function renderCommandSection(verb: VerbSpec): string {
  const blocks = [
    `### ${formatInvocation(verb)}`,
    verb.summary,
    verb.doc ?? "",
    `\`\`\`\n${formatUsage(verb)}\n\`\`\``,
    formatArgsTable(verb.params),
    formatFlagsTable(verb.params),
    formatVerbAttributes(verb),
    formatExamples(verb.examples),
  ];
  return blocks.filter((block) => block.length > 0).join("\n\n");
}

/** Render the CLI command reference, grouped by noun. */
function renderCommandsPage(verbs: readonly VerbSpec[]): string {
  const blocks = [
    "# CLI command reference",
    `Every \`${BIN_NAME}\` command, grouped by noun. Generated from the live capability grammar — do not edit by hand.`,
    "Global flags apply to every command: `--format <plain|llm|json>` (auto-detected — the llm/condensed-Markdown form turns on when output is piped), `--verbose`, and `--detail <summary|standard|detailed>`.",
  ];
  let currentNoun = "";
  for (const verb of verbs) {
    const noun = verb.path[0];
    if (noun !== currentNoun) {
      currentNoun = noun;
      blocks.push(`## ${noun}`);
    }
    blocks.push(renderCommandSection(verb));
  }
  return assemblePage(blocks);
}

/** One MCP tool input row: name, projected type, requiredness, description. */
interface ToolParamRow {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

/** Collect a tool's input rows: the verb's params plus the injected MCP-only ones. */
function collectToolParams(verb: VerbSpec): readonly ToolParamRow[] {
  const rows: ToolParamRow[] = [];
  for (const param of verb.params) {
    rows.push({
      name: param.name,
      type: formatParamType(param),
      required: param.required === true,
      description: describeParam(param),
    });
  }
  if (verb.disclosure) {
    rows.push({
      name: "detail",
      type: `enum(${verb.disclosure.levels.join(", ")})`,
      required: false,
      description: `Progressive-disclosure level (default ${verb.disclosure.default}).`,
    });
  }
  if (verb.capability.mutates) {
    rows.push({
      name: "confirm",
      type: "boolean",
      required: false,
      description:
        "Set true to execute; otherwise a plan is returned (default false).",
    });
    rows.push({
      name: "cwd",
      type: "string",
      required: false,
      description:
        "Absolute project directory to write into; defaults to the server's working directory.",
    });
  }
  return rows;
}

/** The input-params table for a tool, or a storeless-note when it takes none. */
function formatToolParams(verb: VerbSpec): string {
  const rows = collectToolParams(verb);
  if (rows.length === 0) return "_No input parameters._";
  const table = [
    "| Parameter | Type | Required | Description |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const required = row.required ? "yes" : "no";
    table.push(
      `| \`${row.name}\` | ${row.type} | ${required} | ${row.description} |`,
    );
  }
  return table.join("\n");
}

/** The read-only / mutation + destructive annotation line for a tool. */
function formatToolAnnotations(verb: VerbSpec): string {
  if (!verb.capability.mutates) return "Read-only.";
  const destructive =
    verb.capability.destructive === true
      ? " Marked destructive."
      : verb.capability.destructive === false
        ? " Non-destructive."
        : "";
  return `Mutation — plan-first (set \`confirm: true\` to apply).${destructive}`;
}

/** Render one tool's `tools.md` section. */
function renderToolSection(verb: VerbSpec): string {
  const blocks = [
    `### ${toolName(verb.path)}`,
    verb.doc ?? verb.summary,
    formatToolAnnotations(verb),
    "**Input**",
    formatToolParams(verb),
  ];
  return blocks.join("\n\n");
}

/** The non-tool MCP surface (resources + native prompts) declared by the modules. */
function collectMcpExtras(modules: readonly CapabilityModule[]): {
  readonly resources: readonly string[];
  readonly prompts: boolean;
} {
  const resources: string[] = [];
  let prompts = false;
  for (const module of modules) {
    if (module.mcpResources?.surface) {
      resources.push(...module.mcpResources.surface.templates);
    }
    if (module.mcpPrompts) prompts = true;
  }
  // Default lexicographic sort — deterministic, and the same idiom `emitSurface`
  // uses for its `resources`/`tools` lists.
  return { resources: [...resources].sort(), prompts };
}

/** Render the non-tool MCP surface section for `tools.md`. */
function renderNonToolSurface(modules: readonly CapabilityModule[]): string {
  const { resources, prompts } = collectMcpExtras(modules);
  const bullets: string[] = [];
  if (resources.length > 0) {
    bullets.push(
      `- **Resources**: ${resources.map((r) => `\`${r}\``).join(", ")} — entity reads addressed by URI (listing and autocomplete are storeless over the pack index).`,
    );
  }
  if (prompts) {
    bullets.push(
      "- **Prompts**: the workflow prompt templates the active graph declares are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. A graph declaring none leaves both views empty.",
    );
  }
  bullets.push(
    "- **Instructions**: the server always sends handshake instructions describing the conventions and the discovery sequence.",
  );
  return `## Non-tool surface\n\n${bullets.join("\n")}`;
}

/** Render the MCP tool reference plus the non-tool surface. */
function renderToolsPage(
  verbs: readonly VerbSpec[],
  modules: readonly CapabilityModule[],
): string {
  const tools = verbs.filter((verb) => verb.capability.mcp.expose);
  const blocks = [
    "# MCP tool reference",
    `Every tool the ${BIN_NAME} MCP server exposes, plus its non-tool surface. Generated from the live capability grammar — do not edit by hand.`,
    "Mutating tools are plan-first: called without `confirm: true` they return the plan they WOULD apply; called with `confirm: true` they execute. A mutating tool also accepts an optional absolute `cwd`.",
  ];
  for (const verb of tools) {
    blocks.push(renderToolSection(verb));
  }
  blocks.push(renderNonToolSurface(modules));
  return assemblePage(blocks);
}

/** Render the exit-code table, the response envelope, and the error catalog. */
function renderErrorsPage(): string {
  const exitRows = ["| Exit code | Meaning |", "| --- | --- |"];
  // Integer-like keys ("0".."3") are iterated in ascending numeric order by the
  // ECMAScript own-key ordering rule, so `Object.entries` is already sorted.
  for (const [code, meaning] of Object.entries(FIXED_SURFACE.exitCodes)) {
    exitRows.push(`| \`${code}\` | ${meaning} |`);
  }

  const catalogRows = ["| Code | Meaning |", "| --- | --- |"];
  for (const code of ERROR_CODES) {
    const meaning = ERROR_CODE_DESCRIPTIONS[code];
    /* v8 ignore next 3 -- exhaustiveness: ERROR_CODE_DESCRIPTIONS is a Record
       over the ERROR_CODES tuple, so every code is present by construction. */
    if (meaning === undefined) {
      throw new Error(`missing error-code description for ${code}`);
    }
    catalogRows.push(`| \`${code}\` | ${meaning} |`);
  }

  return assemblePage([
    "# Errors & exit codes",
    "Every command returns a `{ ok, ... }` envelope and maps its failure to one of four process exit codes. Generated from the live error kernel — do not edit by hand.",
    "## Exit codes",
    exitRows.join("\n"),
    "## Response envelope",
    `\`\`\`json\n${JSON.stringify(FIXED_SURFACE.envelope, null, 2)}\n\`\`\``,
    "## Error codes",
    "Every `error.code` in a failure envelope is one of the following:",
    catalogRows.join("\n"),
  ]);
}

/** One documented config field: the type label a user sees, and the prose. */
interface ConfigFieldDoc {
  /** The type as a reader needs it, e.g. `string (optional)`. */
  readonly type: string;
  /** What the field does, and anything true about it a reader would not guess. */
  readonly notes: string;
}

/**
 * Every field a config layer may declare. Typed as an exhaustive `Record` over
 * `keyof RawConfig`, so a field added to the type without a row here — or a row
 * left behind by a field that was removed — is a COMPILE error, exactly as
 * {@link ERROR_CODE_DESCRIPTIONS} works for the error kernel. Colocated
 * (single-use) rather than in a module of its own: only `renderConfigPage`
 * reads it, and a third artifact for two consumers to keep in step is what this
 * discipline exists to avoid.
 *
 * The `type` column is authored prose; the page says so. Its OPTIONALITY is
 * checked against the zod validator by `kernel/config/schema.test.ts`.
 */
const CONFIG_FIELD_DOCS: Record<keyof RawConfig, ConfigFieldDoc> = {
  name: {
    type: "string (optional)",
    notes:
      "Distribution-only — see below. The binary's own name, read from the distribution config at module load.",
  },
  help: {
    type: "string (optional)",
    notes:
      "Distribution-only — see below. The one-line blurb on the front door and in the MCP handshake.",
  },
  colophon: {
    type: "string (optional)",
    notes:
      "Distribution-only — see below. Accepted by the validator and read by NOTHING today: `colophon` renders a built-in narrative plus each pack's own `colophon`. Declaring it changes nothing.",
  },
  issuesUrl: {
    type: "URL string (optional)",
    notes:
      "Distribution-only — see below. Where the first-run note asks users to report problems.",
  },
  tier: {
    type: "string (optional)",
    notes:
      "Active tier path; absent means no tier filter. Set it with `config set tier <path>`; `none`, `default` or `-` clear it.",
  },
  channel: {
    type: "`normal` | `experimental` | `prerelease` (optional)",
    notes:
      "Release channel controlling entity visibility. Defaults to `normal`. Set it with `config set channel <name>`.",
  },
  detail: {
    type: "`summary` | `standard` | `detailed` (optional)",
    notes:
      "Default progressive-disclosure level. A closed enum, like `channel`: any other value fails at load with a `CONFIG_ERROR` naming the file and the three levels. Set it with `config set detail <level>`.",
  },
  packs: {
    type: "array (optional)",
    notes:
      "Semantic pack sources built by `sources update`. Each entry is a bare npm name or `{ name, source, stories? }`; `stories` are read stories the pack supplies, in the pack grammar.",
  },
  stories: {
    type: "array (optional)",
    notes:
      "Read stories not attached to any pack, in the pack grammar. Compiled at dispatch, and they win over the same noun declared under `packs[].stories`.",
  },
  prefixes: {
    type: "record (optional)",
    notes:
      "Namespace prefixes the pack is built with — they win every harvest, so this decides which IRI a prefix binds in the store and the index. Every surface uses the compiled-in display/expansion map to compact and expand prefixed names; only the DISTRIBUTION layer seeds it, because it is also read on the storeless fast path, before any config layer exists.",
  },
  completion: {
    type: "object (optional)",
    notes:
      "Completion policy read when `setup completions` emits a script: `minChars` and a per-noun `families` opt-out. It is the one field `config show` carries with NO origin at all.",
  },
};

/**
 * The fields `config show` prints with the layer that supplied them, in the
 * order it prints them. NOT every field: `prefixes` and `completion` reach only
 * the JSON payload, `stories` reaches only its `origins` key, and the four
 * distribution-only fields reach neither. The page said the opposite — that
 * every field but `completion` was reported — which is the claim this whole
 * reference exists to make true rather than plausible.
 *
 * A literal, because the kernel emitter may not import a capability renderer.
 * `capabilities/config/show.render.test.ts` derives the same list from the real
 * formatter and fails if this page and that renderer disagree.
 */
const REPORTED_FIELDS = ["tier", "channel", "detail", "packs"];

/** Render the layered-configuration reference: the layers, then the fields. */
function renderConfigPage(): string {
  const rows = ["| Field | Type | Notes |", "| --- | --- | --- |"];
  for (const [field, doc] of Object.entries(CONFIG_FIELD_DOCS)) {
    rows.push(
      `| \`${field}\` | ${escapeCell(doc.type)} | ${escapeCell(doc.notes)} |`,
    );
  }
  return assemblePage([
    "# Configuration reference",
    `Every field a \`${BIN_NAME}\` config layer may declare. Generated from the config type — do not edit by hand. See [config-model.md](../config-model.md) for the authoring guide.`,
    "## Layers",
    "From lowest to highest precedence:",
    [
      `1. **Built-in defaults** — the distribution config compiled into the binary.`,
      `2. **Global config** — \`$XDG_CONFIG_HOME/${BIN_NAME}/config.json\`, written by \`${BIN_NAME} config set\`.`,
      `3. **Project config** — the nearest \`${PROJECT_CONFIG_FILENAME}\` (or \`${BIN_NAME}.config.js\`, the compiled-binary fallback), walking up from the working directory.`,
    ].join("\n"),
    "A higher layer REPLACES a lower one field by field. No field is deep-merged — not `packs`, not `prefixes`, not `completion`. A project declaring one prefix therefore replaces the distribution's whole prefix map, including the namespaces its own packs are built with; declare every prefix you need, not only the new one.",
    "## Fields",
    "The `Type` column is prose; the field set and each field's optionality are checked against the validator.",
    rows.join("\n"),
    "## Distribution-only fields",
    `\`name\`, \`help\` and \`issuesUrl\` are read from the distribution config when the program loads, because the surfaces that need them — \`--help\`, shell completion, the MCP handshake, the first-run note — run before or without the config layer. \`colophon\` is read by nothing at all. The validator ACCEPTS all four in a global or project layer, and they have **no effect there and are not reported** by \`config show\`. Changing them means forking: edit the distribution config and rebuild the binary. The distribution config's \`vocabulary\` export is not a config field at all — no layer may declare it, and a fork changes it in the same file it changes \`name\` in.`,
    "## What `config show` reports",
    `\`${BIN_NAME} config show\` prints ${REPORTED_FIELDS.map((field) => `\`${field}\``).join(", ")} — those and only those — each with the layer that supplied it. The rest resolve without being reported that way: \`prefixes\` and \`completion\` appear only in the \`--format json\` payload, \`prefixes\` with an origin and \`completion\` with none; \`stories\` carries an origin whose value the payload leaves out; and the four distribution-only fields above carry neither. The plain and llm forms print those rows and nothing else; \`--format json\` returns the resolved config and the origin map whole.`,
    "## Renamed: `packages` → `packs`",
    "The `packages` field was renamed to `packs`. A layer that still declares `packages:` fails loudly: the rename is detected before the schema's unknown-key stripping could hide it, and the error names it. Rename the key — the entry shape is unchanged.",
    "## Removed: `generators`",
    "The `generators` field was removed: it was accepted by the validator, layered, and read by nothing — the `create` verbs resolve their generators statically (a compiled binary can only run generators it was linked with), so declaring it changed only what `config show` printed. A layer that still declares it fails loudly at load with an error naming the removed field; delete it. Declared generators may return as a working feature in a later program.",
    "## Removed: `completion.caseSensitive`",
    "The `completion.caseSensitive` field was removed: it was accepted by the validator and read by nothing — completion matching is declared per parameter by the capability grammar, never configured. A layer that still sets it fails loudly at load with an error naming the removed field; delete the key. `completion.minChars` and `completion.families` are unchanged.",
    "## Reading and writing",
    `\`${BIN_NAME} config show\` prints the resolved config and each field's layer. \`${BIN_NAME} config set <key> <value>\` writes to the **global** layer only — project configs are authored by hand. Both are documented in the [command reference](./commands.md).`,
  ]);
}

/** Render the reference index: overview, derived counts, and links. */
function renderIndexPage(
  verbs: readonly VerbSpec[],
  modules: readonly CapabilityModule[],
): string {
  const nouns = new Set(verbs.map((verb) => verb.path[0]));
  const toolCount = verbs.filter((verb) => verb.capability.mcp.expose).length;
  return assemblePage([
    `# ${BIN_NAME} reference`,
    `Machine-generated reference for the \`${BIN_NAME}\` CLI and MCP server, projected from the live capability grammar. Every page here is regenerated by the build and pinned by a drift-guard test, so it can never fall out of step with the code.`,
    "## At a glance",
    [
      `- **${nouns.size}** command nouns`,
      `- **${verbs.length}** CLI commands`,
      `- **${toolCount}** MCP tools`,
      `- **${collectMcpExtras(modules).resources.length}** resource template(s)`,
    ].join("\n"),
    "## Pages",
    [
      `- [CLI command reference](./commands.md) — every \`${BIN_NAME} <noun> <verb>\`, its arguments, flags, and examples.`,
      "- [MCP tool reference](./tools.md) — every exposed tool, its input schema, and the non-tool surface.",
      "- [Errors & exit codes](./errors.md) — the exit-code table, response envelope, and error catalog.",
      "- [Configuration reference](./config.md) — every config field, the three layers, and how they combine.",
    ].join("\n"),
  ]);
}

/**
 * Emit the Markdown reference doc set for a set of capability modules.
 *
 * Pure and deterministic: the same catalog always yields byte-identical pages
 * (stable sort, declared param order, no version or timestamps).
 *
 * @param modules - The capability modules to project (hidden verbs excluded).
 * @returns A map of `docs/reference/`-relative path → Markdown content, each
 *   ending in exactly one trailing newline.
 */
export function emitReference(
  modules: readonly CapabilityModule[],
): ReferenceDocs {
  const verbs = collectDocVerbs(modules);
  return new Map<string, string>([
    ["index.md", renderIndexPage(verbs, modules)],
    ["commands.md", renderCommandsPage(verbs)],
    ["tools.md", renderToolsPage(verbs, modules)],
    ["errors.md", renderErrorsPage()],
    ["config.md", renderConfigPage()],
  ]);
}
