/**
 * Verb-level help, rendered from a {@link VerbSpec}.
 *
 * Help is designed, not auto-generated: a usage line with positional tokens,
 * the summary and optional extended doc, a flags block, and the verb's own
 * authored examples. Reads only the spec's declarative fields — never the run
 * body — so it stays on the fast `--help` path. Ported from the v1 cli-core
 * `formatVerbHelp`, retargeted at the grammar.
 */

import { kebabCase } from "../../spec/emitSurface.js";
import type { ParamSpec, VerbSpec } from "../../spec/types.js";

/**
 * A verb's `doc` doubles as its MCP tool description, so a pack's authored
 * `toolDescription` may end with an MCP tool-call example — `Example:
 * token_lookup { names: ["…"] }`. That `noun_verb {…}` syntax is MCP-transport
 * shape, meaningless on the CLI, so the CLI projector drops the trailing example
 * sentence; the MCP projector keeps the authored text whole. Hand-written docs
 * carry no such example and pass through untouched.
 */
function stripToolCallExample(doc: string): string {
  return doc.replace(/\s*Example:\s+[a-z][a-z0-9_]*\s*\{[^{}]*\}\.?\s*$/, "");
}

/** The positional usage token for a param (`<name>` / `[name]`, `...` variadic). */
function positionalToken(param: ParamSpec): string {
  const variadic = param.kind === "string[]" ? "..." : "";
  return param.required
    ? `<${param.name}${variadic}>`
    : `[${param.name}${variadic}]`;
}

/** The flag display for a non-positional param (`--kebab` or `--kebab <value>`). */
function flagDisplay(param: ParamSpec): string {
  const flag = `--${kebabCase(param.name)}`;
  if (param.kind === "boolean") return flag;
  if (param.kind === "string[]") return `${flag} <values...>`;
  return `${flag} <value>`;
}

/**
 * Render the full verb help block.
 *
 * @param programName - The CLI binary name shown in the usage line.
 * @param verb - The verb whose interface is documented.
 * @returns The formatted help text.
 */
export function formatVerbHelp(programName: string, verb: VerbSpec): string {
  const commandPath = verb.path
    .filter((s): s is string => Boolean(s))
    .join(" ");
  const positionals = verb.params.filter((p) => p.positional);
  const flags = verb.params.filter((p) => !p.positional);

  const positionalStr = positionals.map(positionalToken).join(" ");
  const usageSuffix = positionalStr ? ` ${positionalStr}` : "";
  const lines: string[] = [
    `Usage: ${programName} ${commandPath}${usageSuffix} [flags]`,
    "",
    verb.summary,
  ];

  if (verb.doc) {
    const cliDoc = stripToolCallExample(verb.doc);
    if (cliDoc) lines.push("", cliDoc);
  }

  if (flags.length > 0) {
    lines.push("", "Flags:");
    const displays = flags.map(flagDisplay);
    const width = Math.max(...displays.map((d) => d.length));
    flags.forEach((flag, index) => {
      const display = displays[index] as string;
      const padding = " ".repeat(width - display.length + 4);
      lines.push(`  ${display}${padding}${flag.doc}`);
    });
  }

  if (verb.examples && verb.examples.length > 0) {
    lines.push("", "Examples:");
    for (const example of verb.examples) {
      lines.push(`  ${example.cmd}`);
      if (example.note) lines.push(`    ${example.note}`);
    }
  }

  return lines.join("\n");
}

/**
 * Render noun-level help — the list of verbs under a noun parent
 * (`pragma2 config --help`).
 *
 * @param programName - The CLI binary name shown in the usage line.
 * @param noun - The noun whose verbs are listed.
 * @param verbs - All registered verbs (filtered to this noun's sub-verbs).
 * @returns The formatted help text.
 */
export function formatNounHelp(
  programName: string,
  noun: string,
  verbs: readonly VerbSpec[],
): string {
  const nounVerbs = verbs.filter(
    (v) => v.path[0] === noun && v.path[1] && !v.hidden,
  );
  if (nounVerbs.length === 0) return `No commands found for "${noun}".`;

  const lines: string[] = [
    `Usage: ${programName} ${noun} <verb> [options]`,
    "",
    "Verbs:",
  ];
  const width = Math.max(...nounVerbs.map((v) => (v.path[1] as string).length));
  for (const verb of nounVerbs) {
    const label = verb.path[1] as string;
    const padding = " ".repeat(width - label.length + 4);
    lines.push(`  ${label}${padding}${verb.summary}`);
  }
  lines.push(
    "",
    `Run \`${programName} ${noun} <verb> --help\` for verb-specific help.`,
  );
  return lines.join("\n");
}
