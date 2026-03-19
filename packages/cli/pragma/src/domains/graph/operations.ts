/**
 * Graph shared operations.
 *
 * Pure functions: Store → typed data.
 * `executeQuery` runs raw SPARQL; `inspectUri` shows all triples about an entity.
 */

import type { QueryResult, Store } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import { buildQuery } from "../shared/buildQuery.js";
import type { InspectResult, PredicateGroup } from "../shared/types.js";

/**
 * Execute a raw SPARQL query against the store.
 *
 * @throws PragmaError with code STORE_ERROR on query failure.
 */
export async function executeQuery(
  store: Store,
  sparql: string,
): Promise<QueryResult> {
  try {
    return await store.query(buildQuery(sparql));
  } catch (error) {
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      {
        recovery:
          "Check your SPARQL syntax. Run `pragma ontology list` to see loaded namespaces.",
      },
    );
  }
}

/**
 * Inspect a URI: show all triples where the URI is the subject,
 * grouped by predicate.
 *
 * @throws PragmaError.notFound if the URI has no triples.
 */
export async function inspectUri(
  store: Store,
  uri: string,
): Promise<InspectResult> {
  const resolvedUri = resolveUri(uri, store.prefixes);

  const result = await store.query(
    buildQuery(`
      SELECT ?predicate ?object
      WHERE {
        <${resolvedUri}> ?predicate ?object .
      }
      ORDER BY ?predicate ?object
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("entity", uri, {
      recovery:
        "Check the URI is correct. Run `pragma graph query` with a SELECT to find valid URIs.",
    });
  }

  const groupMap = new Map<string, string[]>();
  for (const b of result.bindings) {
    const predicate = b.predicate ?? "";
    const object = b.object ?? "";
    const existing = groupMap.get(predicate) ?? [];
    existing.push(object);
    groupMap.set(predicate, existing);
  }

  const groups: PredicateGroup[] = [...groupMap.entries()].map(
    ([predicate, objects]) => ({ predicate, objects }),
  );

  return { uri: resolvedUri, groups };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve a potentially prefixed URI (e.g., `ds:UIBlock`) to a full URI.
 * If the URI is already a full URI (starts with `http`), returns as-is.
 */
function resolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const colonIdx = uri.indexOf(":");
  if (colonIdx === -1) return uri;

  const prefix = uri.slice(0, colonIdx);
  const localName = uri.slice(colonIdx + 1);
  const namespace = prefixes[prefix];

  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefix, {
      validOptions: Object.keys(prefixes),
      recovery: "Run `pragma ontology list` to see known prefixes.",
    });
  }

  return `${namespace}${localName}`;
}
