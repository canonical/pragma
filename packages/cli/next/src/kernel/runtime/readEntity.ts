/**
 * Store-backed single-entity read: every triple where a URI is the subject,
 * grouped by predicate.
 *
 * The ONE reader shared by the `graph inspect` CLI verb and the MCP resource
 * `read` — so a resource read and a `graph inspect` of the same URI return
 * identical content (the mirror contract). The URI is resolved through the
 * store's merged prefix map and validated to the embeddable shape before it is
 * interpolated, so a prefixed name or absolute IRI addresses the subject
 * exactly and user input never reaches the query text raw.
 *
 * Reached only behind the lazy store (a `needsStore` verb / a resource read), so
 * it never lands on the storeless fast path.
 */

import { PragmaError } from "../error/PragmaError.js";
import { resolveUri } from "../packs/iri.js";
import type { PragmaRuntime } from "./types.js";

/** All objects asserted for one predicate on a subject. */
export interface PredicateGroup {
  readonly predicate: string;
  readonly objects: string[];
}

/** The result of inspecting one subject URI. */
export interface InspectResult {
  /** The resolved (full) subject URI. */
  readonly uri: string;
  /** Human label from the pack index, when known. */
  readonly label?: string | null;
  /** Predicate/object groups, ordered by predicate. */
  readonly groups: PredicateGroup[];
}

/**
 * Read one entity's triples, grouped by predicate.
 *
 * @param rt - The runtime (lazy store + query facade).
 * @param uri - A prefixed name or absolute IRI.
 * @returns The resolved URI, its index label, and predicate groups.
 * @throws PragmaError ENTITY_NOT_FOUND when the subject has no triples.
 * @note Impure — boots the store and queries it.
 */
export async function readEntity(
  rt: Pick<PragmaRuntime, "store" | "query">,
  uri: string,
): Promise<InspectResult> {
  const session = await rt.store.get();
  const resolved = resolveUri(uri, session.prefixes);

  const result = await rt.query.sparql(
    `SELECT ?predicate ?object WHERE { <${resolved}> ?predicate ?object } ORDER BY ?predicate ?object`,
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("entity", uri, {
      recovery: {
        message: "Check the URI, or list known entities.",
        cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
        mcp: { tool: "graph_query" },
      },
    });
  }

  const groupMap = new Map<string, string[]>();
  for (const binding of result.bindings) {
    const predicate = binding.predicate ?? "";
    const object = binding.object ?? "";
    const objects = groupMap.get(predicate) ?? [];
    objects.push(object);
    groupMap.set(predicate, objects);
  }
  const groups = [...groupMap.entries()].map(([predicate, objects]) => ({
    predicate,
    objects,
  }));

  const label = session.index.entities.find((e) => e.uri === resolved)?.label;
  return { uri: resolved, ...(label != null ? { label } : {}), groups };
}
