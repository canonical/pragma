/**
 * The usage-error authority, structure-first: the projection's two designed
 * usage-error classes as STRUCTURED FACTS ({@link UsageError}), with the
 * parity prose a pure function of them ({@link renderUsageError}). No host
 * ever parses a message — a host reframing an error for a machine format
 * reads the fields; a host wanting the default presentation renders them.
 *
 * Parser-agnostic and pure: no Commander, no process, no I/O. The adapter
 * (`projection/commander/`) builds these from Commander state and delivers
 * them through the host's `emit` sink.
 */

/** The projection's two designed usage-error classes. */
export type UsageKind = "unknown-segment" | "excess-positional";

/**
 * The structured facts of one designed usage error — the PRIMARY form.
 * No `stray` field: the offending token is already embedded in `headline`
 * (per-kind quotes included) and nothing reads it — pragma's reframer
 * consumes only `suggestion` and `chain`, and the renderer needs only
 * `headline`. A field with zero consumers is cut.
 */
export interface UsageError {
  readonly kind: UsageKind;
  /**
   * Single-line problem clause, prefix-free: `unknown command 'reakt'`,
   * `unexpected argument "Extra"`. Exactly the envelope `message` pragma
   * used to reconstruct by string surgery.
   */
  readonly headline: string;
  /**
   * The matched segment, when one matched — per-kind: for `unknown-segment`
   * the candidate that RANKED closest to the stray (fuzzy, substitutable for
   * it); for `excess-positional` the first OPERAND — bound or excess,
   * possibly the stray itself — that exactly names a sibling or child
   * segment (structural, not a substitution).
   */
  readonly suggestion?: string;
  /**
   * The invocation chain the suggestion completes, bin name first:
   * `[...chain, suggestion].join(" ")` IS the corrected invocation the
   * rendered did-you-mean line names.
   */
  readonly chain: readonly string[];
}

/**
 * Damerau-Levenshtein distance (insert / delete / substitute / adjacent
 * transposition) over a flat row-major matrix — `d[i * width + j]` is the
 * distance between `a`'s first `i` chars and `b`'s first `j` chars.
 */
function editDistance(a: string, b: string): number {
  const width = b.length + 1;
  const d: number[] = Array.from({ length: (a.length + 1) * width }, () => 0);
  for (let i = 0; i <= a.length; i += 1) d[i * width] = i;
  for (let j = 0; j <= b.length; j += 1) d[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        (d[(i - 1) * width + j] as number) + 1,
        (d[i * width + j - 1] as number) + 1,
        (d[(i - 1) * width + j - 1] as number) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (d[(i - 2) * width + j - 2] as number) + cost);
      }
      d[i * width + j] = value;
    }
  }
  return d[a.length * width + b.length] as number;
}

/**
 * The closest segment to a mistyped token: a prefix match wins outright,
 * then the lowest normalized Damerau-Levenshtein distance at or under 0.4 —
 * `suggestNames`' ranking MINUS its exact-match exclusion: a case-only
 * stray (`REACT`) scores 0 on the prefix branch and IS suggested here,
 * where pragma's bin-level suggester deliberately stays silent (its
 * `candidateLower === queryLower` skip). Fuzzed over 200k pairs, the
 * case-only class is the ONLY rank divergence between the two.
 * Case-insensitive; `undefined` when nothing is close (or the token is
 * empty).
 */
function closestSegment(
  query: string,
  candidates: readonly string[],
): string | undefined {
  if (query === "") return undefined;
  const queryLower = query.toLowerCase();
  let best: { name: string; score: number } | undefined;
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    const score = candidateLower.startsWith(queryLower)
      ? 0
      : editDistance(queryLower, candidateLower) /
        Math.max(queryLower.length, candidateLower.length);
    if (score <= 0.4 && (best === undefined || score < best.score)) {
      best = { name: candidate, score };
    }
  }
  return best?.name;
}

/**
 * The designed unknown-segment error beneath a namespace. Commander's own
 * handling is host-divergent by construction — pragma's namespaces carry an
 * action, so its `unknownCommand` never fires and the mount used to
 * re-implement the line, while summon got commander's `(Did you mean x?)` —
 * so the projection owns this error in BOTH CLIs, in the same
 * `Did you mean '<chain> <segment>'?` shape the excess-positional path
 * already uses, suggesting the closest child segment.
 *
 * @param chain - The invoked namespace's full name chain, root (bin name)
 *   first — host-agnostic, so a mounted subtree suggests its real invocation
 *   (`pragma create component react`, not a truncated one).
 * @param stray - The unrecognized segment.
 * @param children - The namespace's child segments.
 * @returns The structured error; {@link renderUsageError} yields the bytes.
 */
export function unknownSegmentError(
  chain: readonly string[],
  stray: string,
  children: readonly string[],
): UsageError {
  const headline = `unknown command '${stray}'`;
  const suggestion = closestSegment(stray, children);
  return suggestion === undefined
    ? { kind: "unknown-segment", headline, chain }
    : { kind: "unknown-segment", headline, suggestion, chain };
}

/**
 * The designed excess-positional error. Commander's default is a generic "too
 * many arguments"; the projection owns this error in BOTH CLIs: the stray is
 * named, and when an operand matches a sibling or child tree segment the
 * corrected command is suggested (`summon component react svelte …` almost
 * certainly meant `summon component svelte …`).
 *
 * The suggestion scans EVERY operand, not just the excess ones: in
 * `summon component react svelte MyComponent` it is `svelte` — bound as the
 * positional — that names the intended sibling, while `MyComponent` is what
 * overflowed. First matching operand wins; a child segment beats a sibling.
 * A sibling match slices the leaf off the chain BEFORE storing it, so
 * `[...chain, suggestion].join(" ")` is the corrected invocation on every
 * branch.
 *
 * @param chain - The invoked command's full name chain, root (bin name)
 *   first — host-agnostic (see {@link unknownSegmentError}).
 * @param stray - The first unexpected operand.
 * @param operands - Every operand the command received (bound + excess).
 * @param siblings - The leaf's sibling segments (other children of its parent).
 * @param children - The leaf's own child segments (runnable-namespace case).
 * @returns The structured error; {@link renderUsageError} yields the bytes.
 */
export function excessPositionalError(
  chain: readonly string[],
  stray: string,
  operands: readonly string[],
  siblings: ReadonlySet<string>,
  children: ReadonlySet<string>,
): UsageError {
  const headline = `unexpected argument "${stray}"`;
  for (const operand of operands) {
    if (children.has(operand)) {
      return {
        kind: "excess-positional",
        headline,
        suggestion: operand,
        chain,
      };
    }
    if (siblings.has(operand)) {
      return {
        kind: "excess-positional",
        headline,
        suggestion: operand,
        chain: chain.slice(0, -1),
      };
    }
  }
  return { kind: "excess-positional", headline, chain };
}

/**
 * The parity bytes of a usage error (one or two lines, no trailing newline):
 * `error: ${headline}`, then the did-you-mean line when a segment matched —
 * `[...chain, suggestion].join(" ")` is the corrected invocation on every
 * builder branch.
 */
export function renderUsageError(error: UsageError): string {
  const headline = `error: ${error.headline}`;
  return error.suggestion === undefined
    ? headline
    : `${headline}\nDid you mean '${[...error.chain, error.suggestion].join(" ")}'?`;
}
