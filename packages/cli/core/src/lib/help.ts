/**
 * Help text formatting — custom renderers that override Commander auto-generation.
 *
 * Per HT.01–HT.03 from B.26: help text is designed, not auto-generated.
 * Semantic grouping, examples, and distinct global vs command flag sections.
 *
 * @packageDocumentation
 */

import { convertCamelToKebab } from "./convertCase.js";
import type { CommandDefinition, ParameterDefinition } from "./types.js";

/**
 * Format help text for a noun-level command (lists available verbs).
 *
 * @example
 * ```
 * pragma component --help
 *
 * Usage: pragma component <verb> [options]
 *
 * Verbs:
 *   list    List components in current tier
 *   get     Get component details
 *
 * Run `pragma component <verb> --help` for verb-specific help.
 * ```
 */
export function formatNounHelp(
  programName: string,
  noun: string,
  commands: readonly CommandDefinition[],
): string {
  const verbCommands = commands.filter(
    (c) => c.path.length > 1 && c.path[0] === noun,
  );

  if (verbCommands.length === 0) {
    return `No commands found for "${noun}".`;
  }

  const lines: string[] = [];
  lines.push(`Usage: ${programName} ${noun} <verb> [options]`);
  lines.push("");
  lines.push("Verbs:");

  // Calculate padding for alignment
  const maxVerbLen = Math.max(
    ...verbCommands.map((c) => (c.path[1] as string).length),
  );

  for (const cmd of verbCommands) {
    const verb = cmd.path[1];
    /* v8 ignore next — structurally guaranteed: verbCommands filtered to path.length > 1 */
    if (!verb) throw new Error("Expected verb in command path");
    const padding = " ".repeat(maxVerbLen - verb.length + 4);
    lines.push(`  ${verb}${padding}${cmd.description}`);
  }

  lines.push("");
  lines.push(
    `Run \`${programName} ${noun} <verb> --help\` for verb-specific help.`,
  );

  return lines.join("\n");
}

/**
 * Format help text for a verb-level command (shows full interface).
 *
 * @example
 * ```
 * Usage: pragma component get <name> [flags]
 *
 * Get detailed information about a component.
 *
 * Flags:
 *   --detailed    Full detail (anatomy, modifiers, tokens, standards)
 *   --anatomy     Show anatomy tree only
 *
 * Examples:
 *   pragma component get Button
 *   pragma component get Button --detailed --llm
 * ```
 */
export function formatVerbHelp(
  programName: string,
  cmd: CommandDefinition,
): string {
  const lines: string[] = [];
  const commandPath = cmd.path.join(" ");

  // Usage line
  const positionals = cmd.parameters.filter((p) => p.positional);
  const positionalStr = positionals
    .map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`))
    .join(" ");
  const usageSuffix = positionalStr ? ` ${positionalStr}` : "";
  lines.push(`Usage: ${programName} ${commandPath}${usageSuffix} [flags]`);

  // Description
  lines.push("");
  lines.push(cmd.description);

  // Extended help
  if (cmd.meta?.extendedHelp) {
    lines.push("");
    lines.push(cmd.meta.extendedHelp);
  }

  // Flags (non-positional parameters)
  const flags = cmd.parameters.filter((p) => !p.positional);
  if (flags.length > 0) {
    lines.push("");

    if (cmd.parameterGroups && Object.keys(cmd.parameterGroups).length > 0) {
      // Grouped parameters
      const grouped = new Set<string>();
      for (const [groupName, paramNames] of Object.entries(
        cmd.parameterGroups,
      )) {
        const groupFlags = paramNames
          .map((name) => flags.find((f) => f.name === name))
          .filter((f): f is ParameterDefinition => f !== undefined);

        if (groupFlags.length > 0) {
          lines.push(`${groupName}:`);
          appendFlags(lines, groupFlags);
          lines.push("");
          for (const f of groupFlags) grouped.add(f.name);
        }
      }

      // Ungrouped flags
      const ungrouped = flags.filter((f) => !grouped.has(f.name));
      if (ungrouped.length > 0) {
        lines.push("Flags:");
        appendFlags(lines, ungrouped);
      }
    } else {
      lines.push("Flags:");
      appendFlags(lines, flags);
    }
  }

  // Examples
  if (cmd.meta?.examples && cmd.meta.examples.length > 0) {
    lines.push("");
    lines.push("Examples:");
    for (const example of cmd.meta.examples) {
      lines.push(`  ${example}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format help text for the top-level program.
 *
 * Groups commands semantically and shows global flags once.
 */
export function formatHelp(
  programName: string,
  description: string,
  commands: readonly CommandDefinition[],
  groups?: ReadonlyArray<{
    readonly name: string;
    readonly nouns: readonly string[];
  }>,
): string {
  const lines: string[] = [];
  lines.push(`${programName} — ${description}`);
  lines.push("");
  lines.push(`Usage: ${programName} <command> [options]`);
  lines.push("");
  lines.push("Commands:");

  // Collect unique nouns with their descriptions
  const nounDescriptions = new Map<string, string>();
  for (const cmd of commands) {
    const noun = cmd.path[0];
    /* v8 ignore next — commands always have at least one path segment */
    if (!noun) throw new Error("Expected command path[0] to be defined");
    if (!nounDescriptions.has(noun)) {
      // Use the first command's description or a generic one
      if (cmd.path.length === 1) {
        nounDescriptions.set(noun, cmd.description);
      } else {
        nounDescriptions.set(noun, `${noun} commands`);
      }
    }
  }

  if (groups && groups.length > 0) {
    // Use provided semantic grouping
    for (const group of groups) {
      for (const noun of group.nouns) {
        const desc = nounDescriptions.get(noun);
        /* v8 ignore next — noun was populated in the loop above */
        if (!desc) throw new Error(`Expected description for noun "${noun}"`);
        const maxLen = Math.max(
          ...[...nounDescriptions.keys()].map((n) => n.length),
        );
        const padding = " ".repeat(maxLen - noun.length + 4);
        lines.push(`  ${noun}${padding}${desc}`);
      }
    }
  } else {
    // Default: alphabetical
    const maxLen = Math.max(
      ...[...nounDescriptions.keys()].map((n) => n.length),
    );
    for (const [noun, desc] of [...nounDescriptions.entries()].sort()) {
      const padding = " ".repeat(maxLen - noun.length + 4);
      lines.push(`  ${noun}${padding}${desc}`);
    }
  }

  lines.push("");
  lines.push("Global flags:");
  lines.push("  --llm           Condensed Markdown output");
  lines.push("  --format json   JSON output");
  lines.push("  --verbose       Diagnostic output");
  lines.push("  --help          Show help");
  lines.push("  --version       Show version");
  lines.push("");
  lines.push(
    `Run \`${programName} <command> --help\` for command-specific help.`,
  );

  return lines.join("\n");
}

/**
 * Format help for LLM consumption — condensed Markdown with token costs.
 *
 * More compact than terminal help, optimized for context window budget.
 */
export function formatLlmHelp(
  programName: string,
  commands: readonly CommandDefinition[],
): string {
  const lines: string[] = [];
  lines.push(`# ${programName} commands`);
  lines.push("");

  // Group by noun
  const byNoun = new Map<string, CommandDefinition[]>();
  for (const cmd of commands) {
    const noun = cmd.path[0];
    /* v8 ignore next — commands always have at least one path segment */
    if (!noun) throw new Error("Expected command path[0] to be defined");
    const existing = byNoun.get(noun) ?? [];
    existing.push(cmd);
    byNoun.set(noun, existing);
  }

  for (const [noun, cmds] of [...byNoun.entries()].sort()) {
    lines.push(`## ${noun}`);
    for (const cmd of cmds) {
      const commandPath = cmd.path.join(" ");
      const positionals = cmd.parameters.filter((p) => p.positional);
      const positionalStr = positionals
        .map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`))
        .join(" ");
      const flags = cmd.parameters
        .filter((p) => !p.positional)
        .map((p) => `--${convertCamelToKebab(p.name)}`)
        .join(" ");

      const parts = [`\`${programName} ${commandPath}`];
      if (positionalStr) parts[0] += ` ${positionalStr}`;
      parts[0] += "`";
      if (flags) parts.push(`flags: ${flags}`);
      lines.push(`- ${parts.join(" — ")}`);
      lines.push(`  ${cmd.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Append formatted flag lines to the output array.
 */
function appendFlags(
  lines: string[],
  flags: readonly ParameterDefinition[],
): void {
  const maxFlagLen = Math.max(...flags.map((f) => formatFlagDisplay(f).length));

  for (const flag of flags) {
    const display = formatFlagDisplay(flag);
    const padding = " ".repeat(maxFlagLen - display.length + 4);
    lines.push(`  ${display}${padding}${flag.description}`);
  }
}

/**
 * Format a flag for display in help text.
 */
function formatFlagDisplay(param: ParameterDefinition): string {
  const kebab = convertCamelToKebab(param.name);
  switch (param.type) {
    case "boolean":
      return `--${kebab}`;
    case "multiselect":
      return `--${kebab} <values...>`;
    default:
      return `--${kebab} <value>`;
  }
}
