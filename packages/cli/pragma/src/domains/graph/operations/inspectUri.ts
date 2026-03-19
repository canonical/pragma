/**
 * Inspect a URI: show all triples where the URI is the subject,
 * grouped by predicate.
 *
 * @throws PragmaError.notFound if the URI has no triples.
 */

import type { Store } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { buildQuery } from "../../shared/buildQuery.js";
import type { InspectResult, PredicateGroup } from "../../shared/types.js";
import resolveUri from "../helpers/resolveUri.js";

export default async function inspectUri(
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
