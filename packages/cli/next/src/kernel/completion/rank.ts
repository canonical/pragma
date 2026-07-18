/**
 * Candidate ranking and filtering for the completion tiers.
 *
 * Two disciplines, deliberately different:
 * - {@link filterPrefix} for STRUCTURAL sets (nouns, verbs, flag names):
 *   case-sensitive `startsWith` + lexicographic sort, agreeing with what the
 *   static scripts' `compgen -W` would produce for the same table.
 * - {@link rankCandidates} for VALUE sets (enum values, entity names):
 *   case-insensitive exact > prefix > substring, deduped, tie-broken
 *   lexicographically, capped — ported from the v1 `rankUriCompletions`.
 */

/** Maximum candidates a ranked (value-tier) resolution returns. */
export const MAX_CANDIDATES = 50;

/** Match strength of a partial against one candidate, higher is better. */
const NO_MATCH = 0;
const SUBSTRING_MATCH = 1;
const PREFIX_MATCH = 2;
const EXACT_MATCH = 3;

/** Score a lowercased candidate against a lowercased partial. */
function score(candidate: string, partial: string): number {
  if (candidate === partial) return EXACT_MATCH;
  if (candidate.startsWith(partial)) return PREFIX_MATCH;
  if (candidate.includes(partial)) return SUBSTRING_MATCH;
  return NO_MATCH;
}

/**
 * Rank value candidates for a partial word.
 *
 * Case-insensitive; exact > prefix > substring; ties broken by the candidate
 * text for determinism; duplicates dropped; capped at `limit`. An empty
 * partial matches everything (as a prefix), so it lists the full set sorted.
 *
 * @param candidates - The candidate values.
 * @param partial - The partial word being completed.
 * @param limit - Maximum candidates to return.
 * @returns Ranked, deduped, capped candidates.
 */
export function rankCandidates(
  candidates: readonly string[],
  partial: string,
  limit: number = MAX_CANDIDATES,
): string[] {
  const needle = partial.toLowerCase();

  const scored: { candidate: string; strength: number }[] = [];
  for (const candidate of candidates) {
    const strength = score(candidate.toLowerCase(), needle);
    if (strength > NO_MATCH) scored.push({ candidate, strength });
  }

  scored.sort((a, b) =>
    b.strength !== a.strength
      ? b.strength - a.strength
      : a.candidate.localeCompare(b.candidate),
  );

  const seen = new Set<string>();
  const ranked: string[] = [];
  for (const { candidate } of scored) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    ranked.push(candidate);
    if (ranked.length >= limit) break;
  }
  return ranked;
}

/**
 * Filter a structural set by a case-sensitive prefix.
 *
 * @param candidates - The structural candidates (nouns, verbs, flag names).
 * @param partial - The partial word being completed.
 * @returns The matches, deduped and sorted lexicographically.
 */
export function filterPrefix(
  candidates: readonly string[],
  partial: string,
): string[] {
  return [...new Set(candidates)]
    .filter((candidate) => candidate.startsWith(partial))
    .sort((a, b) => a.localeCompare(b));
}
