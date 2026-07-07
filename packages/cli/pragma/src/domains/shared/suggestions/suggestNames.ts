/**
 * Rank candidates by similarity to a failed lookup query.
 *
 * Returns up to {@link maxResults} names sorted by relevance:
 * 1. Prefix matches (query is a case-insensitive prefix of candidate)
 * 2. Edit-distance matches (Damerau-Levenshtein, normalized ≤ threshold)
 *
 * Exact matches are excluded — if the query exactly matches a candidate,
 * the caller should have found it and never reached this function.
 *
 * @param query - The user-supplied name that failed lookup.
 * @param candidates - All known names in the domain.
 * @param opts.maxResults - Max suggestions to return (default: 5).
 * @param opts.threshold - Max normalized edit distance (default: 0.4).
 * @returns Ranked suggestions with original casing preserved.
 */
export default function suggestNames(
  query: string,
  candidates: readonly string[],
  opts?: { maxResults?: number; threshold?: number },
): string[] {
  if (query === "") return [];

  const maxResults = opts?.maxResults ?? 5;
  const threshold = opts?.threshold ?? 0.4;
  const queryLower = query.toLowerCase();

  type Scored = { name: string; score: number };
  const scored: Scored[] = [];

  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();

    if (candidateLower === queryLower) continue;

    if (candidateLower.startsWith(queryLower)) {
      scored.push({ name: candidate, score: 0 });
      continue;
    }

    const distance = damerauLevenshtein(queryLower, candidateLower);
    const maxLen = Math.max(queryLower.length, candidateLower.length);
    const normalized = maxLen === 0 ? 0 : distance / maxLen;

    if (normalized <= threshold) {
      scored.push({ name: candidate, score: normalized });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, maxResults).map((s) => s.name);
}

/**
 * Damerau-Levenshtein distance between two strings.
 *
 * Counts insertions, deletions, substitutions, and adjacent transpositions.
 */
function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Fully allocated (lenA + 1) × (lenB + 1) grid: every row/column index in
  // [0, lenA] × [0, lenB] below is provably in bounds, so `row.at(j)` never
  // yields undefined for the indices we read.
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

/**
 * Read a matrix row that is structurally guaranteed to exist.
 *
 * @throws if the row is missing, signalling a broken allocation invariant.
 */
function getRow(matrix: number[][], index: number): number[] {
  const row = matrix.at(index);
  if (row === undefined) {
    throw new Error(`matrix row ${index} is out of bounds`);
  }
  return row;
}

/**
 * Read a matrix cell that is structurally guaranteed to exist.
 *
 * @throws if the cell is missing, signalling a broken allocation invariant.
 */
function getCell(row: number[], index: number): number {
  const cell = row.at(index);
  if (cell === undefined) {
    throw new Error(`matrix cell ${index} is out of bounds`);
  }
  return cell;
}
