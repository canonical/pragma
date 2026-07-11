import { PragmaError } from "#error";
import type { LookupResult } from "./contracts.js";

/**
 * Resolve multiple lookup queries and collect structured per-query failures.
 *
 * Used by MCP lookup tools so a single call can return multiple results
 * without failing the entire request when one query is missing.
 *
 * The collection loop never rejects: a `PragmaError` becomes an error entry
 * with its own code, and any other thrown value becomes an `INTERNAL_ERROR`
 * entry — so one poisoned query cannot discard the other queries' results.
 * Each lookup is invoked inside an `async` wrapper so even a *synchronous*
 * throw (before a promise is returned) is captured as a rejection rather
 * than escaping the batch. `meta.internalErrorCount` reports how many
 * entries are internal errors.
 */
export default async function lookupMany<TResult>(
  queries: readonly string[],
  lookup: (query: string) => Promise<TResult>,
): Promise<LookupResult<TResult>> {
  const errors: Array<{
    query: string;
    code: string;
    message: string;
    suggestions?: readonly string[];
  }> = [];
  const settled = await Promise.allSettled(
    // The `async` wrapper turns synchronous throws from `lookup` into
    // rejections, so they settle as errors instead of escaping the batch.
    queries.map(async (query) => lookup(query)),
  );
  const results: TResult[] = [];
  let internalErrorCount = 0;

  for (const [index, outcome] of settled.entries()) {
    const query = queries[index];
    if (!query) {
      continue;
    }

    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
      continue;
    }

    const error = outcome.reason;

    if (error instanceof PragmaError) {
      errors.push({
        query,
        code: error.code,
        message: error.message,
        ...(error.suggestions.length > 0 && {
          suggestions: error.suggestions,
        }),
      });
    } else {
      internalErrorCount += 1;
      const reason = error instanceof Error ? error.message : String(error);
      errors.push({
        query,
        code: "INTERNAL_ERROR",
        message: `Internal error: ${reason}`,
      });
    }
  }

  return { results, errors, meta: { internalErrorCount } };
}

/**
 * Build MCP envelope metadata for a lookup result.
 *
 * Always reports `count`; includes `internalErrorCount` only when at least
 * one query failed unexpectedly, so healthy responses stay unchanged.
 *
 * @param result - A lookup result, typically produced via {@link lookupMany}.
 * @returns Meta object for the `{ ok, data, meta }` tool envelope.
 */
export function lookupToolMeta<TResult>(result: LookupResult<TResult>): {
  count: number;
  internalErrorCount?: number;
} {
  const internalErrorCount = result.meta?.internalErrorCount ?? 0;
  return {
    count: result.results.length,
    ...(internalErrorCount > 0 && { internalErrorCount }),
  };
}
