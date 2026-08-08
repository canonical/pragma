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
  CompletionSource,
  FlagEntry,
  NounEntry,
  VerbEntry,
} from "../types.js";

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
 *
 * Module-private: `renderPositionalArm` below is the only caller, and it is the shell-
 * independent step the three templates share. It was exported when `bash.ts` and
 * `zsh.ts` each ran their own copy of that scan.
 */
function valueFlagNames(model: CompletionModel, view: VerbView): string[] {
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

/**
 * The bin name reduced to a shell-safe identifier body.
 *
 * The three templates each spelled this regex out, prefixed differently:
 * bash and zsh want `_<name>`, fish wants `__<name>` (its convention for a
 * helper that must not collide with a user function). Only the SANITISER was
 * duplicated; the prefix is a real per-shell difference, so it stays visible at
 * each call site instead of becoming a parameter that hides it.
 *
 * @param binName - The distribution's bin name.
 * @returns The name with every character outside `[A-Za-z0-9_]` replaced by `_`.
 */
export function sanitizeBinName(binName: string): string {
  return binName.replace(/[^A-Za-z0-9_]/g, "_");
}

/**
 * Wrap a set of case arms in a `case … in … esac` block, or nothing when there
 * are no arms.
 *
 * POSIX `case` syntax, so bash and zsh had byte-identical copies of it. fish
 * has no `case` outside `switch` and never had one.
 *
 * @param subject - The already-quoted subject expression.
 * @param arms - The rendered arms, each already indented.
 * @param indent - The indent for the `case`/`esac` lines themselves.
 * @returns The block's lines, or `[]` when `arms` is empty.
 */
export function wrapInCaseBlock(
  subject: string,
  arms: readonly string[],
  indent: string,
): string[] {
  if (arms.length === 0) return [];
  return [`${indent}case ${subject} in`, ...arms, `${indent}esac`];
}

/**
 * Render one verb view's positional-completion arm, or nothing when no
 * positional of that verb has a completable source.
 *
 * bash and zsh had byte-identical bodies for this, differing only in the
 * diagnostic label passed to {@link wordList} and in what `sourceAction`
 * returns — the latter being real shell syntax (`compgen -W` vs `compadd`), so
 * it is injected rather than branched on. The SHAPE of the arm is the thing
 * both shells must agree about, and now they cannot disagree by accident.
 *
 * @param model - The completion model.
 * @param view - The (noun, verb) view to render.
 * @param fn - The script's function-name base.
 * @param sourceAction - The shell's action for a value source, or undefined.
 * @param label - The shell's `wordList` diagnostic label for its value flags.
 * @returns The arm's lines joined, or undefined when there is nothing to offer.
 */
export function renderPositionalArm(
  model: CompletionModel,
  view: VerbView,
  fn: string,
  sourceAction: (source: CompletionSource, fn: string) => string | undefined,
  label: string,
): string | undefined {
  const slots: string[] = [];
  view.verb.positionals.forEach((positional, index) => {
    const action = sourceAction(positional.source, fn);
    if (action === undefined) return;
    const last = index === view.verb.positionals.length - 1;
    const pattern = positional.variadic && last ? "*" : String(index);
    slots.push(`        ${pattern}) ${action} ;;`);
  });
  if (slots.length === 0) return undefined;
  return [
    `    ${view.key})`,
    `      ${fn}_pos ${view.skipWords} "${wordList(valueFlagNames(model, view), label)}"`,
    '      case "$POS" in',
    ...slots,
    "      esac",
    "      ;;",
  ].join("\n");
}
