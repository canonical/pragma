import type { Store } from "@canonical/ke";
import expandGlob, { isGlobPattern } from "./expandGlob.js";
import type { Domain } from "./listDomainNames.js";
import listDomainNames from "./listDomainNames.js";

interface ExpandedQueries {
  /** Concrete names to pass to lookupMany. */
  readonly names: string[];
  /** Errors for glob patterns that matched nothing. */
  readonly globErrors: readonly {
    query: string;
    code: string;
    message: string;
  }[];
}

/**
 * Partition lookup queries into concrete names and expanded globs.
 *
 * Literal names pass through unchanged. Glob patterns are expanded against
 * the domain's full name list. Globs that match nothing produce an
 * EMPTY_RESULTS error entry.
 */
export default async function expandLookupQueries(
  queries: readonly string[],
  store: Store,
  domain: Domain,
): Promise<ExpandedQueries> {
  const hasGlobs = queries.some(isGlobPattern);
  if (!hasGlobs) {
    return { names: [...queries], globErrors: [] };
  }

  const allNames = await listDomainNames(store, domain);
  const names: string[] = [];
  const globErrors: { query: string; code: string; message: string }[] = [];

  for (const query of queries) {
    if (!isGlobPattern(query)) {
      names.push(query);
      continue;
    }

    const expanded = expandGlob(query, allNames);
    if (expanded.length === 0) {
      globErrors.push({
        query,
        code: "EMPTY_RESULTS",
        message: `No ${domain}s matching "${query}".`,
      });
    } else {
      names.push(...expanded);
    }
  }

  return { names, globErrors };
}
