/**
 * The `__complete` resolver — the dynamic completion tier.
 *
 * STORELESS in PR1: matches are computed from the grammar alone (nouns, verbs,
 * global flags), never the store or config, so the resolver stays instant and
 * safe on the `__complete` fast path. The config/index dynamic tiers join in
 * PR2. The model is derived from the capability modules the same way the static
 * shell scripts are, so both tiers agree.
 */

import type { CapabilityModule } from "../spec/types.js";

/** The static completion model: what to offer at each position. */
export interface CompletionModel {
  /** Top-level nouns, sorted. */
  readonly nouns: readonly string[];
  /** Verb labels per noun. */
  readonly verbs: Readonly<Record<string, readonly string[]>>;
  /** Global flags offered when the current word starts with `-`. */
  readonly globalFlags: readonly string[];
}

/** The global flags offered by completion (mirrors the surface's globalFlags). */
export const COMPLETION_GLOBAL_FLAGS = [
  "--llm",
  "--format",
  "--verbose",
  "--detail",
  "--help",
  "--version",
] as const;

/**
 * Derive the static completion model from the capability modules.
 *
 * Hidden verbs are excluded, but `mcp` — served by the bin, not projected — is
 * added so `pragma2 mc<Tab>` completes it, matching the root help.
 *
 * @param modules - The capability modules.
 * @returns The completion model.
 */
export function buildCompletionModel(
  modules: readonly CapabilityModule[],
): CompletionModel {
  const verbs: Record<string, string[]> = {};
  const nouns = new Set<string>(["mcp"]);

  for (const module of modules) {
    for (const verb of module.verbs) {
      if (verb.hidden) continue;
      const [noun, sub] = verb.path;
      nouns.add(noun);
      if (sub) {
        const list = verbs[noun] ?? [];
        list.push(sub);
        verbs[noun] = list;
      }
    }
  }

  return {
    nouns: [...nouns].sort(),
    verbs,
    globalFlags: [...COMPLETION_GLOBAL_FLAGS],
  };
}

/**
 * Resolve completions for the current words against the model.
 *
 * The last word is the partial being completed; the words before it establish
 * position (noun, then verb). A partial starting with `-` completes flags.
 *
 * @param words - The command words after `pragma2` (the last is the partial).
 * @param model - The completion model.
 * @returns The matching completions, in offer order.
 */
export function complete(
  words: readonly string[],
  model: CompletionModel,
): string[] {
  const last = words[words.length - 1] ?? "";
  const prior = words.slice(0, -1);

  if (last.startsWith("-")) {
    return model.globalFlags.filter((flag) => flag.startsWith(last));
  }

  if (prior.length === 0) {
    return model.nouns.filter((noun) => noun.startsWith(last));
  }

  if (prior.length === 1) {
    const verbs = model.verbs[prior[0] as string];
    if (verbs) return verbs.filter((verb) => verb.startsWith(last));
  }

  return [];
}

/**
 * Build the model from modules and resolve completions in one call.
 *
 * @param words - The command words after `pragma2`.
 * @param modules - The capability modules.
 * @returns The matching completions.
 */
export function runComplete(
  words: readonly string[],
  modules: readonly CapabilityModule[],
): string[] {
  return complete(words, buildCompletionModel(modules));
}
