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

import type { Completer, CompletionResult, CompletionTree } from "../types.js";

export default function resolveCompletion(
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
