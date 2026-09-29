/**
 * Rank candidate names by similarity to a failed token.
 *
 * Ported near-verbatim from the v1 suggester: prefix matches first, then
 * Damerau-Levenshtein edit-distance matches under a normalized threshold. Used
 * by the unknown-command suggester to turn a typo into "Did you mean: …?".
 */

/** How many suggestions are returned unless a caller asks for fewer or more. */
export const MAX_SUGGESTIONS = 5;

/** What separates the segments of a path-shaped name (`:` ends a prefix). */
const SEGMENT_SEPARATOR = /[./:]/;

/** Past this many segments a query is not a name, and its runs are not built. */
const MAX_RUN_SEGMENTS = 16;

/**
 * Every contiguous run of whole segments of `query` shorter than the query,
 * mapped to the number of segments it spans; empty for a query of one segment
 * or of more than {@link MAX_RUN_SEGMENTS}.
 */
function segmentRuns(query: string): ReadonlyMap<string, number> {
  if (query.split(SEGMENT_SEPARATOR).length > MAX_RUN_SEGMENTS) {
    return new Map();
  }
  const starts = [0];
  for (const [index, char] of [...query].entries()) {
    if (SEGMENT_SEPARATOR.test(char)) starts.push(index + 1);
  }
  const ends = [...starts.slice(1).map((start) => start - 1), query.length];
  const runs = new Map<string, number>();
  for (const [from, start] of starts.entries()) {
    for (const [to, end] of ends.entries()) {
      const run = query.slice(start, end);
      if (to < from || run === "" || run === query) continue;
      runs.set(run, to - from + 1);
    }
  }
  return runs;
}

/**
 * Return up to {@link maxResults} candidates most similar to `query`.
 *
 * Exact matches are excluded — a match means the caller should have resolved it
 * and never reached here. "Exact" is judged on the TRIMMED, case-folded token,
 * which is the same equality the resolver's own name FILTER applies, so the two
 * cannot disagree about whether a candidate is a match. They did:
 * `block lookup Timeline` missed an entity whose `ds:name` ends in a space and
 * then suggested "Timeline " back, which reads as the CLI declining to accept
 * the word it just printed. Restating the query is never a useful suggestion —
 * if a candidate really is the query, the miss is the bug and the suggestion
 * would only hide it.
 *
 * Ranking, best first: a candidate that is a run of the query's whole segments
 * (`color.text` for `color.text.primary`), longest first; then a candidate the
 * query is a prefix of; then edit distance.
 *
 * Scoring reads the same trimmed forms, so padding costs a candidate no edit
 * distance either; what is RETURNED is the candidate verbatim, padding and
 * casing intact, because a suggestion names a value the graph holds.
 *
 * @param query - The token that failed to resolve.
 * @param candidates - All known names to rank against.
 * @param opts.maxResults - Max suggestions to return (default 5).
 * @param opts.threshold - Max normalized edit distance (default 0.4).
 * @returns Ranked suggestions, original spelling preserved.
 */
export function suggestNames(
  query: string,
  candidates: readonly string[],
  opts?: { maxResults?: number; threshold?: number },
): string[] {
  const maxResults = opts?.maxResults ?? MAX_SUGGESTIONS;
  const threshold = opts?.threshold ?? 0.4;
  const queryLower = query.trim().toLowerCase();

  // A token that is nothing but whitespace has no word to rank against, the
  // same as the empty one.
  if (queryLower === "") return [];

  type Scored = { name: string; score: number };
  const scored: Scored[] = [];
  const runs = segmentRuns(queryLower);

  for (const candidate of candidates) {
    const candidateLower = candidate.trim().toLowerCase();

    if (candidateLower === queryLower) continue;

    // Below zero: every run outranks a prefix match, the longest run first.
    const spanned = runs.get(candidateLower);
    if (spanned !== undefined) {
      scored.push({ name: candidate, score: -spanned });
      continue;
    }

    if (candidateLower.startsWith(queryLower)) {
      scored.push({ name: candidate, score: 0 });
      continue;
    }

    const maxLen = Math.max(queryLower.length, candidateLower.length);
    // Skip on LENGTH before building a matrix. An edit distance is at least the
    // difference in length, so a candidate whose length alone already exceeds
    // the threshold cannot pass it — and the full Damerau-Levenshtein for it
    // costs an O(n·m) matrix allocation. This changes no result, only the cost
    // of reaching it: ranking one mistyped name against the shipped pack's
    // 4,380 entities took 1.2 SECONDS, which is a long time to wait to be told
    // about a typo.
    if (
      Math.abs(queryLower.length - candidateLower.length) >
      threshold * maxLen
    ) {
      continue;
    }

    const distance = damerauLevenshtein(queryLower, candidateLower);
    const normalized = maxLen === 0 ? 0 : distance / maxLen;

    if (normalized <= threshold) {
      scored.push({ name: candidate, score: normalized });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, maxResults).map((s) => s.name);
}

/**
 * Damerau-Levenshtein distance: insertions, deletions, substitutions, and
 * adjacent transpositions.
 */
function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from<number>({ length: lenB + 1 }).fill(0),
  );

  for (let i = 0; i <= lenA; i++) {
    getRow(matrix, i)[0] = i;
  }
  const firstRow = getRow(matrix, 0);
  for (let j = 0; j <= lenB; j++) {
    firstRow[j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    const prevRow = getRow(matrix, i - 1);
    const row = getRow(matrix, i);
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      row[j] = Math.min(
        getCell(prevRow, j) + 1, // deletion
        getCell(row, j - 1) + 1, // insertion
        getCell(prevRow, j - 1) + cost, // substitution
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        const prevPrevRow = getRow(matrix, i - 2);
        row[j] = Math.min(
          getCell(row, j),
          getCell(prevPrevRow, j - 2) + cost, // transposition
        );
      }
    }
  }

  return getCell(getRow(matrix, lenA), lenB);
}

/** Read a matrix row that is structurally guaranteed to exist. */
function getRow(matrix: number[][], index: number): number[] {
  const row = matrix.at(index);
  if (row === undefined) {
    throw new Error(`matrix row ${index} is out of bounds`);
  }
  return row;
}

/** Read a matrix cell that is structurally guaranteed to exist. */
function getCell(row: number[], index: number): number {
  const cell = row.at(index);
  if (cell === undefined) {
    throw new Error(`matrix cell ${index} is out of bounds`);
  }
  return cell;
}
