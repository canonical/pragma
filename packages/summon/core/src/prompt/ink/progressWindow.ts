/**
 * Pure helpers for the wizard's live progress view (C7/M7): keep each completed
 * effect on ONE line by middle-truncating long paths, so a big application
 * scaffold's progress does not wrap and jitter. Paired with rendering the
 * completed lines under Ink's `<Static>` in `Wizard.tsx` — which is what
 * actually stops the full-history re-render on every effect (the flicker/scroll
 * root) — this keeps the live frame to a bounded, single-line-per-effect window.
 *
 * Truncation is DISPLAY-WIDTH aware, not UTF-16-code-unit aware. It iterates
 * whole Unicode code points (so a supplementary-plane character is never sliced
 * between its surrogate halves into a lone-surrogate `�`), and it counts East
 * Asian Wide / Fullwidth / emoji code points as two terminal columns — because
 * Ink lays the line out by cell width, so a code-unit cap alone would still let
 * wide glyphs overflow and wrap. {@link measureDisplayWidth} is the shared
 * width approximation both concerns rely on.
 *
 * A `.ts` sibling of the JSX view so the string math is unit testable.
 */

/** Max display columns a single progress line may occupy before it is truncated. */
export const MAX_PROGRESS_LINE = 72;

/** The single-column marker inserted where a truncated middle was elided. */
export const TRUNCATION_MARKER = "…";

/**
 * East Asian Wide / Fullwidth / emoji code-point ranges, each an inclusive
 * `[low, high]` pair. A code point inside any range is rendered by terminals in
 * two columns rather than one. This is a compact approximation of a full
 * `wcwidth` table — enough to keep a path on one row (the wizard's only need),
 * covering the CJK blocks, Hangul, kana, fullwidth forms, and the common emoji
 * planes — not an exhaustive Unicode width oracle.
 */
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], // Hangul Jamo
  [0x2e80, 0x303e], // CJK radicals, Kangxi, CJK symbols & punctuation
  [0x3041, 0x33ff], // Hiragana, Katakana, CJK compatibility
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xa000, 0xa4cf], // Yi syllables and radicals
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe30, 0xfe4f], // CJK compatibility forms
  [0xff00, 0xff60], // Fullwidth forms
  [0xffe0, 0xffe6], // Fullwidth signs
  [0x1f300, 0x1faff], // Miscellaneous symbols & pictographs, emoji
  [0x20000, 0x3fffd], // CJK Unified Ideographs Extension B and beyond
];

/**
 * Report whether a Unicode code point renders as two terminal columns.
 *
 * @param codePoint - A Unicode scalar value (as from `String.codePointAt`).
 * @returns `true` for East Asian Wide / Fullwidth / emoji code points.
 */
function isWideCodePoint(codePoint: number): boolean {
  for (const [low, high] of WIDE_RANGES) {
    if (codePoint >= low && codePoint <= high) return true;
  }
  return false;
}

/**
 * Decode the Unicode scalar value a single iterator character represents.
 *
 * A string iterator yields one code point per step as a one- or two-code-unit
 * string; a two-unit string is a surrogate pair, recombined here into its
 * scalar value. `charCodeAt` (which returns a number, never `undefined`) reads
 * the code units, so no non-null assertion is needed.
 *
 * @param char - One code-point string, as produced by iterating a string.
 * @returns The scalar Unicode code point value.
 */
function decodeCodePoint(char: string): number {
  const high = char.charCodeAt(0);
  if (char.length < 2) return high;
  const low = char.charCodeAt(1);
  return (high - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
}

/**
 * Measure the terminal-column width of a string, summing per-code-point widths:
 * one column for most code points, two for East Asian Wide / emoji ones (see
 * {@link isWideCodePoint}). Iterating code points rather than UTF-16 code units
 * means a surrogate pair counts once, as the single glyph it renders to.
 *
 * @param text - The string to measure.
 * @returns The approximate number of terminal columns `text` occupies.
 */
export function measureDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += isWideCodePoint(decodeCodePoint(char)) ? 2 : 1;
  }
  return width;
}

/**
 * Concatenate the longest run of code points taken from `chars` in order whose
 * combined display width fits `budget`, stopping before the first code point
 * that would overflow it — so a surrogate pair or a wide glyph is never
 * partially included.
 *
 * @param chars - Code points (each a whole-character string) to draw from.
 * @param budget - The display-width budget, in terminal columns.
 * @returns The width-bounded prefix of `chars`, joined back into a string.
 */
function collectWithinWidth(chars: readonly string[], budget: number): string {
  let width = 0;
  let out = "";
  for (const char of chars) {
    const next = width + measureDisplayWidth(char);
    if (next > budget) break;
    width = next;
    out += char;
  }
  return out;
}

/**
 * Middle-truncate a progress line to `max` DISPLAY columns, preserving BOTH
 * ends — a described effect's verb prefix (e.g. `Write file:`) and the tail of
 * its path (the most identifying part) — and eliding the middle with
 * {@link TRUNCATION_MARKER}.
 *
 * Width is measured and cut by {@link measureDisplayWidth}, iterating whole
 * code points, so the one-row guarantee holds for multibyte and wide (CJK /
 * emoji) paths and a surrogate pair is never split into a lone-surrogate `�`.
 *
 * @param line - The described-effect line (e.g. `Write file: a/b/c.ts (12 bytes)`).
 * @param max - The width cap, in columns; defaults to {@link MAX_PROGRESS_LINE}.
 * @returns The line unchanged when within the cap, else its truncated form.
 */
export function truncateMiddle(
  line: string,
  max: number = MAX_PROGRESS_LINE,
): string {
  if (measureDisplayWidth(line) <= max) return line;
  const budget = Math.max(0, max - measureDisplayWidth(TRUNCATION_MARKER));
  const headBudget = Math.ceil(budget / 2);
  const tailBudget = Math.floor(budget / 2);
  const chars = [...line];
  const head = collectWithinWidth(chars, headBudget);
  // The tail is collected from the reversed code points, then re-reversed back
  // into reading order — keeping every code point whole throughout.
  const reversedTail = collectWithinWidth([...chars].reverse(), tailBudget);
  const tail = [...reversedTail].reverse().join("");
  return `${head}${TRUNCATION_MARKER}${tail}`;
}
