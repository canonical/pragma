/**
 * Build a completion tree from a set of command definitions.
 *
 * Extracts nouns (path[0]), verbs (path[1]), and argument completers
 * from each command's parameter definitions.
 */

import { convertCamelToKebab } from "../convertCase.js";
import type {
  ArgCompleters,
  CommandDefinition,
  Completer,
  CompletionTree,
  ParameterDefinition,
  VerbCompletions,
} from "../types.js";

export default function buildCompleters(
  commands: readonly CommandDefinition[],
): CompletionTree {
  const nouns = new Map<string, VerbCompletions>();

  for (const cmd of commands) {
    if (cmd.path.length === 0) continue;
    const noun = cmd.path[0];
    if (!noun) continue;

    let verbEntry = nouns.get(noun);
    if (!verbEntry) {
      verbEntry = { verbs: new Map() };
      nouns.set(noun, verbEntry);
    }

    const verb = cmd.path.length > 1 ? cmd.path[1] : undefined;
    if (!verb) continue;

    const completers = extractCompleters(cmd.parameters);
    const flags = extractFlags(cmd.parameters);
    (verbEntry.verbs as Map<string, ArgCompleters>).set(verb, {
      completers,
      flags,
    });
  }

  return { nouns };
}

/**
 * Collect the long flag names (`--kebab-case`) a verb accepts, from its
 * non-positional parameters, for flag-level tab completion.
 *
 * @param parameters - The command's parameter definitions.
 * @returns The `--flag` strings, in declaration order.
 */
function extractFlags(parameters: readonly ParameterDefinition[]): string[] {
  return parameters
    .filter((param) => !param.positional)
    .map((param) => `--${convertCamelToKebab(param.name)}`);
}

function extractCompleters(
  parameters: readonly ParameterDefinition[],
): Completer[] {
  const completers: Completer[] = [];

  for (const param of parameters) {
    if (param.complete) {
      completers.push(param.complete);
    } else if (param.choices && param.choices.length > 0) {
      const choices = param.choices;
      completers.push(async (partial: string) => {
        const lower = partial.toLowerCase();
        return choices
          .filter((c) => c.value.toLowerCase().startsWith(lower))
          .map((c) => c.value);
      });
    }
  }

  return completers;
}
