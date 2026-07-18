/**
 * Execute a `source: "graphql"` pack lookup's generated document and unwrap the
 * result to the flat pack entity shape.
 *
 * Retargeted onto the PR2 facade: the compiled schema comes from the booted
 * `StoreSession` (`rt.store.get()`), and the document runs through
 * `rt.query.graphql` (ke-graphql's in-process `executeLocal` — no server, no
 * HTTP). Relay envelopes are unwrapped here (connections → arrays, entity
 * references → IRI strings, prefixed URIs → full IRIs), so the resolved entity
 * is shape-identical to the SPARQL path.
 *
 * Injection safety: the resolved entity IRI enters execution EXCLUSIVELY via
 * `variableValues.uri` — never interpolated into the document text, which is
 * composed only from validated pack terms and compiled schema names.
 */

import { PragmaError } from "../../error/PragmaError.js";
import type { PragmaRuntime } from "../../runtime/types.js";
import type { PackChildRow, PackEntity, PackLookup } from "../types.js";
import {
  buildLookupDocument,
  type FieldProjection,
} from "./buildLookupDocument.js";

/**
 * @param rt - The runtime (lazy store + query facade).
 * @param lookup - The validated lookup declaration.
 * @param entityUri - IRI resolved by the SPARQL name→URI query (store output).
 * @param entityName - The entity's canonical stored name.
 * @param source - Pack source, for error attribution.
 * @param prefixes - The runtime's merged prefix map (prefixed→full expansion).
 * @param level - Active canonical level (gates fields/expands at fetch).
 * @returns The unwrapped pack entity.
 * @throws PragmaError STORE_UNAVAILABLE when execution reports errors,
 *   CONFIG_ERROR when the pack does not map onto the schema.
 * @note Impure — reads the compiled schema and queries the store.
 */
export async function fetchGraphqlLookup(
  rt: Pick<PragmaRuntime, "store" | "query">,
  lookup: PackLookup,
  entityUri: string,
  entityName: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
  level?: string,
): Promise<PackEntity> {
  const session = await rt.store.get();
  const plan = buildLookupDocument(lookup, session.schema, source, level);

  const result = await rt.query.graphql(plan.source, { uri: entityUri });

  if (result.errors && result.errors.length > 0) {
    const messages = result.errors
      .slice(0, 3)
      .map((error) => error.message)
      .join("; ");
    throw PragmaError.storeUnavailable(`GraphQL lookup failed: ${messages}`, {
      recovery: {
        message: "Inspect the compiled schema for this graph.",
        cli: "pragma graph inspect",
      },
    });
  }

  const node = (result.data as { node?: unknown } | null | undefined)?.node;
  if (node === null || node === undefined || typeof node !== "object") {
    throw PragmaError.storeUnavailable(
      `GraphQL lookup could not resolve <${entityUri}> — its rdf:type may be missing from the ontology.`,
      {
        recovery: {
          message: "Inspect the entity's triples.",
          cli: `pragma graph inspect ${entityUri}`,
        },
      },
    );
  }

  const entity: PackEntity = { uri: entityUri, name: entityName };
  const record = node as Record<string, unknown>;
  for (const projection of plan.projections) {
    const value = unwrapProjection(
      record[projection.name],
      projection,
      prefixes,
    );
    if (value !== undefined) entity[projection.name] = value;
  }
  return entity;
}

/** Unwrap one projected key to the flat pack shape (absent → omitted). */
function unwrapProjection(
  value: unknown,
  projection: FieldProjection,
  prefixes: Readonly<Record<string, string>>,
): string | readonly PackChildRow[] | undefined {
  switch (projection.kind) {
    case "scalar":
      return value === null || value === undefined ? undefined : String(value);
    case "iri":
      return value === null || value === undefined
        ? undefined
        : expandPrefixed(String(value), prefixes);
    case "entity":
      return unwrapEntityRef(value, prefixes);
    case "collection": {
      const nodes = collectionNodes(value, projection.connection);
      return nodes.map((node) =>
        unwrapChildRow(node, projection.children, prefixes),
      );
    }
  }
}

/** Unwrap `{ uri }` to the full IRI string (the identity field is prefixed). */
function unwrapEntityRef(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string | undefined {
  const uri = (value as { uri?: unknown } | null | undefined)?.uri;
  return typeof uri === "string" ? expandPrefixed(uri, prefixes) : undefined;
}

/** Strip the Relay envelope (or pass a plain list through) to node records. */
function collectionNodes(
  value: unknown,
  connection: boolean,
): Record<string, unknown>[] {
  if (connection) {
    const edges = (value as { edges?: unknown } | null | undefined)?.edges;
    if (!Array.isArray(edges)) return [];
    return edges
      .map((edge) => (edge as { node?: unknown }).node)
      .filter(
        (node): node is Record<string, unknown> =>
          typeof node === "object" && node !== null,
      );
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (node): node is Record<string, unknown> =>
      typeof node === "object" && node !== null,
  );
}

/**
 * Unwrap one child row. A nested expand with a single scalar select collapses
 * each grandchild to that value (so `values: ["Dense", "Comfortable"]`); a
 * multi-field select keeps one record per grandchild.
 */
function unwrapChildRow(
  node: Record<string, unknown>,
  children: readonly FieldProjection[],
  prefixes: Readonly<Record<string, string>>,
): PackChildRow {
  const row: PackChildRow = {};
  for (const child of children) {
    const value = node[child.name];
    if (child.kind === "collection") {
      const grandchildren = collectionNodes(value, child.connection);
      const single =
        child.children.length === 1 && child.children[0]?.kind === "scalar"
          ? child.children[0]
          : undefined;
      row[child.name] = single
        ? grandchildren
            .map((grandchild) => grandchild[single.name])
            .filter((v): v is string => v !== null && v !== undefined)
            .map(String)
        : grandchildren.map((grandchild) => {
            const record: Record<string, string> = {};
            for (const leaf of child.children) {
              const leafValue = unwrapLeaf(
                grandchild[leaf.name],
                leaf,
                prefixes,
              );
              if (leafValue !== undefined) record[leaf.name] = leafValue;
            }
            return record;
          });
      continue;
    }
    const unwrapped = unwrapLeaf(value, child, prefixes);
    if (unwrapped !== undefined) row[child.name] = unwrapped;
  }
  return row;
}

/** Unwrap one non-collection leaf value (entity refs and `uri` → full IRIs). */
function unwrapLeaf(
  value: unknown,
  leaf: FieldProjection,
  prefixes: Readonly<Record<string, string>>,
): string | undefined {
  if (leaf.kind === "entity") return unwrapEntityRef(value, prefixes);
  if (value === null || value === undefined) return undefined;
  return leaf.kind === "iri"
    ? expandPrefixed(String(value), prefixes)
    : String(value);
}

/** Expand a prefixed URI (`ds:global`) to its full IRI via the merged prefixes. */
function expandPrefixed(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (uri.includes("://")) return uri;
  const colon = uri.indexOf(":");
  if (colon === -1) return uri;
  const namespace = prefixes[uri.slice(0, colon)];
  return namespace ? `${namespace}${uri.slice(colon + 1)}` : uri;
}
