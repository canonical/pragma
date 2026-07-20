/**
 * Shared rendering helpers for the static shell-completion templates.
 *
 * Everything a template interpolates flows through here: tokens are
 * re-asserted against the safety allowlist at emit time (belt-and-braces on
 * top of the model-build gate), and the per-(noun,verb) views give each shell
 * the same case-table data, so the three scripts can never disagree about
 * structure. All lists are derived from the model — the templates contain no
 * live names of their own.
 */

import { assertSafeToken } from "../model.js";
import type {
  CompletionModel,
  FlagEntry,
  NounEntry,
  VerbEntry,
} from "../types.js";

export { assertSafeToken } from "../model.js";

/** One (noun, verb) pair a script addresses — self-verbs have key `noun/`. */
export interface VerbView {
  /** The noun token. */
  readonly noun: string;
  /** The verb entry (the noun's self-verb when `self`). */
  readonly verb: VerbEntry;
  /** Whether this is the noun's self-verb (bare invocation). */
  readonly self: boolean;
  /** The case-table key: `noun/label` for sub-verbs, `noun/` for self. */
  readonly key: string;
  /** Non-flag words before the first positional (1 self, 2 sub). */
  readonly skipWords: 1 | 2;
}

/**
 * Every verb view of the model, in deterministic order (nouns sorted, each
 * noun's self-verb first, then its sub-verbs sorted).
 */
export function verbViews(model: CompletionModel): VerbView[] {
  const views: VerbView[] = [];
  for (const entry of model.nouns) {
    if (entry.selfVerb) {
      views.push({
        noun: entry.noun,
        verb: entry.selfVerb,
        self: true,
        key: `${entry.noun}/`,
        skipWords: 1,
      });
    }
    for (const verb of entry.verbs) {
      views.push({
        noun: entry.noun,
        verb,
        self: false,
        key: `${entry.noun}/${verb.label}`,
        skipWords: 2,
      });
    }
  }
  return views;
}

/**
 * Join already-validated tokens into a script word list, re-asserting each
 * (flags are validated on their bare name — the dashes are ours).
 *
 * @param tokens - The tokens to inline.
 * @param where - Human-readable location for the throw message.
 * @returns The space-joined list, safe to place inside double quotes.
 * @throws Error when any token fails the allowlist.
 */
export function wordList(tokens: readonly string[], where: string): string {
  for (const token of tokens) {
    assertSafeToken(token.replace(/^--?/, ""), where);
  }
  return tokens.join(" ");
}

/** The noun tokens offered at the root. */
export function nounNames(model: CompletionModel): string[] {
  return model.nouns.map((entry: NounEntry) => entry.noun);
}

/** Global flag names offered at the root (includes `rootOnly`). */
export function rootFlagNames(model: CompletionModel): string[] {
  return model.globalFlags.map((flag) => flag.flag);
}

/** Global flag names offered after a noun (excludes `rootOnly`). */
export function globalFlagNames(model: CompletionModel): string[] {
  return model.globalFlags
    .filter((flag) => flag.rootOnly !== true)
    .map((flag) => flag.flag);
}

/** Global flags that take a value (their values are inlined per shell). */
export function globalValueFlags(model: CompletionModel): FlagEntry[] {
  return model.globalFlags.filter((flag) => flag.takesValue);
}

/** The flag names a view offers: verb + mutation (iff mutates) + globals. */
export function offeredFlagNames(
  model: CompletionModel,
  view: VerbView,
): string[] {
  return [
    ...view.verb.flags.map((flag) => flag.flag),
    ...(view.verb.mutates ? model.mutationFlags.map((flag) => flag.flag) : []),
    ...globalFlagNames(model),
  ];
}

/**
 * Every value-taking flag in scope for a view (verb + globals) — the flags
 * whose values a positional-index scan must skip.
 */
export function valueFlagNames(
  model: CompletionModel,
  view: VerbView,
): string[] {
  return [
    ...view.verb.flags
      .filter((flag) => flag.takesValue)
      .map((flag) => flag.flag),
    ...globalValueFlags(model).map((flag) => flag.flag),
  ];
}

/** Whether a view has any flag of its own to name (beyond the globals). */
export function hasOwnFlags(view: VerbView): boolean {
  return view.verb.flags.length > 0 || view.verb.mutates;
}
