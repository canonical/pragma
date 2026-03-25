import { PragmaError } from "#error";
import type { LookupResult } from "./contracts.js";

/**
 * Resolve multiple lookup queries and collect structured per-query failures.
 *
 * Used by MCP lookup tools so a single call can return multiple results
 * without failing the entire request when one query is missing.
 */
export default async function lookupMany<TResult>(
  queries: readonly string[],
  lookup: (query: string) => Promise<TResult>,
): Promise<LookupResult<TResult>> {
  const errors: Array<{ query: string; code: string; message: string }> = [];
  const settled = await Promise.allSettled(
    queries.map((query) => lookup(query)),
  );
  const results: TResult[] = [];

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
      });
    } else {
      throw error;
    }
  }

  return { results, errors };
}
