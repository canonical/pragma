/**
 * Verb-level help, rendered from a {@link VerbSpec}.
 *
 * Help is designed, not auto-generated: a usage line with positional tokens,
 * the summary and optional extended doc, a flags block, and the verb's own
 * authored examples. Reads only the spec's declarative fields — never the run
 * body — so it stays on the fast `--help` path. Ported from the v1 cli-core
 * `formatVerbHelp`, retargeted at the grammar.
 */

import { renderCall } from "../../spec/call.js";
import { exampleCall, useWhenSentence } from "../../spec/guidance.js";
import type { Example, ParamSpec, VerbSpec } from "../../spec/index.js";
import { kebabCase } from "../../spec/index.js";
import { MUTATION_FLAG_DOCS, negationFlagDoc } from "./constants.js";
import {
  helpColumns,
  helpDim,
  helpHeading,
  helpTerm,
  helpUsage,
} from "./helpFormat.js";

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
    helpUsage(`${programName} ${commandPath}${usageSuffix} [flags]`),
    "",
    verb.summary,
  ];

  if (verb.doc) lines.push("", verb.doc);
  const question = useWhenSentence(verb);
  if (question) lines.push("", question);

  // Every flag the command PARSES is rendered, from the same spec facts
  // registration reads: the declared params, each default-true boolean's
  // `--no-` negation, and — on a mutating verb — the auto-injected mutation
  // flags. Help denying a working flag is the drift this derivation removes.
  const flagRows: (readonly [string, string])[] = flags.flatMap((flag) => {
    const rows: (readonly [string, string])[] = [
      [flagDisplay(flag), flag.doc] as const,
    ];
    if (flag.kind === "boolean" && flag.default === true) {
      const kebab = kebabCase(flag.name);
      rows.push([`--no-${kebab}`, negationFlagDoc(kebab)] as const);
    }
    return rows;
  });
  if (verb.capability.mutates) {
    flagRows.push(
      ...MUTATION_FLAG_DOCS.map(({ flag, doc }) => [flag, doc] as const),
    );
  }
  if (flagRows.length > 0) {
    lines.push("", helpHeading("Flags"), ...helpColumns(flagRows));
  }

  // The verb's declared example leads, spelled as a command by the same
  // renderer that spells it as a tool call in the MCP description.
  const declaredExample = exampleCall(verb);
  const generated = declaredExample && renderCall(declaredExample, "cli");
  const examples = [
    ...(generated ? [{ cmd: generated } as Example] : []),
    ...(verb.examples ?? []).filter((example) => example.cmd !== generated),
  ];
  if (examples.length > 0) {
    lines.push("", helpHeading("Examples"));
    for (const example of examples) {
      lines.push(`  ${helpTerm(example.cmd)}`);
      if (example.note) lines.push(`    ${helpDim(example.note)}`);
    }
  }

  lines.push("", verbHelpFooter(programName, verb));

  return lines.join("\n");
}

/**
 * The footer pointing at the next help level: a sub-verb points UP to its noun
 * page (`pragma block --help`), a self-verb points to the root (`pragma
 * --help`). Uniform across every verb page — the leaf pages used to have none.
 */
function verbHelpFooter(programName: string, verb: VerbSpec): string {
  if (verb.path.length > 1) {
    const noun = verb.path[0];
    return helpDim(
      `Run \`${programName} ${noun} --help\` to see all ${noun} commands.`,
    );
  }
  return helpDim(`Run \`${programName} --help\` to see all commands.`);
}

/**
 * Render noun-level help — the list of verbs under a noun parent
 * (`pragma config --help`).
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
    helpUsage(`${programName} ${noun} <verb> [flags]`),
    "",
    helpHeading("Verbs"),
    ...helpColumns(
      nounVerbs.map((verb) => [verb.path[1] as string, verb.summary]),
    ),
    "",
    helpDim(
      `Run \`${programName} ${noun} <verb> --help\` for details on a verb.`,
    ),
  ];
  return lines.join("\n");
}
