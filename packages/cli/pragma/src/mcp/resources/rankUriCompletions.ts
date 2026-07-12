import type { UriCompletionCandidate } from "./types.js";

/** Match strength of a query against one field, higher is better. */
const NO_MATCH = 0;
const SUBSTRING_MATCH = 1;
const PREFIX_MATCH = 2;
const EXACT_MATCH = 3;

/** Score a single lowercased field against a lowercased query. */
function scoreField(field: string, query: string): number {
  if (field === query) return EXACT_MATCH;
  if (field.startsWith(query)) return PREFIX_MATCH;
  if (field.includes(query)) return SUBSTRING_MATCH;
  return NO_MATCH;
}

/**
 * Rank URI autocomplete candidates for a partial query.
 *
 * Matches case-insensitively against BOTH the compacted URI and the human
 * label, so `button` completes `ds:global.component.button` and a label
 * fragment works too. Ranks exact > prefix > substring (taking the stronger
 * of the two fields), breaks ties by compacted URI for determinism, and caps
 * the result at `limit`. Returns compacted URIs — the values a client reads.
 *
 * @param candidates - Listable subjects with their compacted URI and label.
 * @param query - The partial text typed by the client.
 * @param limit - Maximum suggestions to return.
 * @returns Ranked, deduped, capped compacted URIs.
 */
export default function rankUriCompletions(
  candidates: readonly UriCompletionCandidate[],
  query: string,
  limit: number,
): string[] {
  const needle = query.toLowerCase();

  const scored: { prefixed: string; score: number }[] = [];
  for (const candidate of candidates) {
    const uriScore = scoreField(candidate.prefixed.toLowerCase(), needle);
    const labelScore =
      candidate.label === null
        ? NO_MATCH
        : scoreField(candidate.label.toLowerCase(), needle);
    const score = Math.max(uriScore, labelScore);
    if (score > NO_MATCH) scored.push({ prefixed: candidate.prefixed, score });
  }

  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.prefixed.localeCompare(b.prefixed),
  );

  const seen = new Set<string>();
  const ranked: string[] = [];
  for (const { prefixed } of scored) {
    if (seen.has(prefixed)) continue;
    seen.add(prefixed);
    ranked.push(prefixed);
    if (ranked.length >= limit) break;
  }
  return ranked;
}
