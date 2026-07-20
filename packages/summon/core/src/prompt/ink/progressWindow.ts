/**
 * Pure helpers for the wizard's live progress view (C7/M7): keep each completed
 * effect on ONE line by middle-truncating long paths, so a big application
 * scaffold's progress does not wrap and jitter. Paired with rendering the
 * completed lines under Ink's `<Static>` in `Wizard.tsx` — which is what
 * actually stops the full-history re-render on every effect (the flicker/scroll
 * root) — this keeps the live frame to a bounded, single-line-per-effect window.
 *
 * A `.ts` sibling of the JSX view so the string math is unit testable.
 */

/** Max characters a single progress line may occupy before it is truncated. */
export const MAX_PROGRESS_LINE = 72;

/** The single-character marker inserted where a truncated middle was elided. */
export const TRUNCATION_MARKER = "…";

/**
 * Middle-truncate a progress line to `max`, preserving BOTH ends — a described
 * effect's verb prefix (e.g. `Write file:`) and the tail of its path (the most
 * identifying part) — and eliding the middle with {@link TRUNCATION_MARKER}.
 *
 * @param line - The described-effect line (e.g. `Write file: a/b/c.ts (12 bytes)`).
 * @param max - The width cap; defaults to {@link MAX_PROGRESS_LINE}.
 * @returns The line unchanged when within the cap, else its truncated form.
 */
export function truncateMiddle(
  line: string,
  max: number = MAX_PROGRESS_LINE,
): string {
  if (line.length <= max) return line;
  const budget = Math.max(0, max - TRUNCATION_MARKER.length);
  const head = Math.ceil(budget / 2);
  const tail = Math.floor(budget / 2);
  // `slice(length - 0)` is already "", so no `tail > 0` guard is needed.
  return `${line.slice(0, head)}${TRUNCATION_MARKER}${line.slice(line.length - tail)}`;
}
