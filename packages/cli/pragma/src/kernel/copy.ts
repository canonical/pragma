/**
 * The house rules for user-facing copy, as data.
 *
 * Every string this CLI prints is one product speaking, and a product with one
 * voice phrases one meaning one way. These descriptors name the phrasings that
 * are out of that voice, why, and what to write instead; `copy.test.ts` runs
 * them over every authored string literal in the tree — the same scanner and
 * file sets as the naming rules there, so comments, regexes, module specifiers
 * and test fixtures are never in scope. A failure quotes the offending literal,
 * the rule, and the fix, and nothing else: everything a maintainer needs to
 * correct the string lives in this file.
 *
 * Rules are DATA rather than assertions so the set can grow (or move into a
 * shared standards package) without rewriting the guard, and so each rule's
 * pattern, statement and fix are reviewed together as one unit. Precision is
 * the set's credibility: a pattern that fires on domain vocabulary gets
 * disabled in practice, so a carve-out is encoded in the pattern itself — with
 * its reason — never in an exemption list beside it.
 */

/** One banned phrasing: what copy may not contain, why, and the rewrite. */
export interface CopyRule {
  /** What the copy must not contain. */
  readonly pattern: RegExp;
  /** The house rule, stated for a reader of THIS codebase. */
  readonly rule: string;
  /** How to fix an offending string. */
  readonly fix: string;
}

/** The banned phrasings for user-facing copy. Enforced by `copy.test.ts`. */
export const COPY_RULES: readonly CopyRule[] = [
  {
    pattern: /\b(?:could not|failed to|unable to)\b/i,
    rule: "User-facing copy says `cannot` — one phrasing for one meaning, so the CLI reads as one voice.",
    fix: "Rewrite with `cannot` (present tense, no hedging), naming what is wrong rather than what was attempted.",
  },
  {
    // `\w+n't` covers every negated contraction in one arm; the lookbehind
    // carves out `do/don't`, which is domain vocabulary — the name of the
    // paired good/bad example a coding standard ships — not conversational
    // tone. The second arm lists the pronoun contractions, which have no
    // shared suffix shape.
    pattern:
      /\b(?<!do\/)\w+n't\b|\b(?:you|we|they|it|that|there|here|what|let)'(?:re|ve|ll|s|d)\b|\bi'm\b/i,
    rule: "No contractions in user-facing copy — instructions read as statements, not conversation.",
    fix: "Spell the words out, or restructure the sentence to drop the second person.",
  },
  {
    pattern: /\b(?:please|sorry|oops)\b/i,
    rule: "The CLI does not apologise or plead; it states the fact and the action.",
    fix: "Drop the pleading word and instruct directly: `Report this issue at <url>.`",
  },
];
