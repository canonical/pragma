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

  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from<number>({ length: lenB + 1 }).fill(0),
  );

  for (let i = 0; i <= lenA; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1, // deletion
        matrix[i]![j - 1]! + 1, // insertion
        matrix[i - 1]![j - 1]! + cost, // substitution
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i]![j] = Math.min(
          matrix[i]![j]!,
          matrix[i - 2]![j - 2]! + cost, // transposition
        );
      }
    }
  }

  return matrix[lenA]![lenB]!;
}
