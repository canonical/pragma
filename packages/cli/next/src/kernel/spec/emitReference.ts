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

/** The full CLI invocation head for a verb (`pragma <noun>` or `pragma <noun> <verb>`). */
function formatInvocation(verb: VerbSpec): string {
  const sub = verb.path[1];
  return sub === undefined
    ? `pragma ${verb.path[0]}`
    : `pragma ${verb.path[0]} ${sub}`;
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
      ? "- Store: reads the local store (`pragma sources update` builds it)."
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
    "Every `pragma` command, grouped by noun. Generated from the live capability grammar — do not edit by hand.",
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
      "- **Prompts**: the design system's workflow templates are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools.",
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
    "Every tool the pragma MCP server exposes, plus its non-tool surface. Generated from the live capability grammar — do not edit by hand.",
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

/** Render the reference index: overview, derived counts, and links. */
function renderIndexPage(
  verbs: readonly VerbSpec[],
  modules: readonly CapabilityModule[],
): string {
  const nouns = new Set(verbs.map((verb) => verb.path[0]));
  const toolCount = verbs.filter((verb) => verb.capability.mcp.expose).length;
  return assemblePage([
    "# pragma reference",
    "Machine-generated reference for the `pragma` CLI and MCP server, projected from the live capability grammar. Every page here is regenerated by the build and pinned by a drift-guard test, so it can never fall out of step with the code.",
    "## At a glance",
    [
      `- **${nouns.size}** command nouns`,
      `- **${verbs.length}** CLI commands`,
      `- **${toolCount}** MCP tools`,
      `- **${collectMcpExtras(modules).resources.length}** resource template(s)`,
    ].join("\n"),
    "## Pages",
    [
      "- [CLI command reference](./commands.md) — every `pragma <noun> <verb>`, its arguments, flags, and examples.",
      "- [MCP tool reference](./tools.md) — every exposed tool, its input schema, and the non-tool surface.",
      "- [Errors & exit codes](./errors.md) — the exit-code table, response envelope, and error catalog.",
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
  ]);
}
