/**
 * Completion infrastructure — derives tab-completion from CommandDefinition[].
 *
 * Three-level resolution per PA.12 / CP.03–CP.07:
 * - Level 1: noun names (from path[0]) — instant, static
 * - Level 2: verb names (from path[1]) — instant, static
 * - Level 3: argument values (from ParameterDefinition.complete or choices) — dynamic
 *
 * @packageDocumentation
 */

import type {
  ArgCompleters,
  CommandDefinition,
  Completer,
  CompletionResult,
  CompletionTree,
  ParameterDefinition,
  VerbCompletions,
} from "./types.js";

/**
 * Build a completion tree from a set of command definitions.
 *
 * Extracts nouns (path[0]), verbs (path[1]), and argument completers
 * from each command's parameter definitions.
 */
export function buildCompleters(
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
    (verbEntry.verbs as Map<string, ArgCompleters>).set(verb, { completers });
  }

  return { nouns };
}

/**
 * Resolve a partial CLI input into a completion result.
 *
 * Parses the input words and determines which level of completion
 * to provide:
 *
 * - 0 or 1 words → Level 1 (noun completion)
 * - 2 words, second incomplete → Level 2 (verb completion)
 * - 3+ words or complete verb → Level 3 (argument completion)
 */
export function resolveCompletion(
  tree: CompletionTree,
  words: readonly string[],
): CompletionResult {
  const partial = words.length > 0 ? (words[words.length - 1] ?? "") : "";

  if (words.length <= 1) {
    const completer: Completer = async (p: string) => {
      const lower = p.toLowerCase();
      return [...tree.nouns.keys()].filter((n) => n.startsWith(lower)).sort();
    };
    return { completer, partial, level: 1 };
  }

  const noun = words[0] ?? "";
  const nounEntry = tree.nouns.get(noun);
  if (!nounEntry) {
    return { completer: undefined, partial, level: 1 };
  }

  if (words.length === 2) {
    const verbPartial = words[1] ?? "";
    const completer: Completer = async (p: string) => {
      const lower = p.toLowerCase();
      return [...nounEntry.verbs.keys()]
        .filter((v) => v.startsWith(lower))
        .sort();
    };
    return { completer, partial: verbPartial, level: 2 };
  }

  const verb = words[1] ?? "";
  const argEntry = nounEntry.verbs.get(verb);
  if (!argEntry || argEntry.completers.length === 0) {
    return { completer: undefined, partial, level: 3 };
  }

  const completer = argEntry.completers[0];
  return { completer, partial, level: 3 };
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
