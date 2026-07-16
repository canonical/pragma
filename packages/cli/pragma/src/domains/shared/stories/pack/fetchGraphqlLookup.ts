import { executeLocal, isIncrementalResults } from "@canonical/ke-graphql";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../types/index.js";
import buildLookupDocument, {
  type FieldProjection,
} from "./buildLookupDocument.js";
import type { PackChildRow, PackEntity, StoryPackLookup } from "./types.js";

/**
 * Execute a `source: "graphql"` pack lookup's generated document and unwrap
 * the result to the flat pack entity shape.
 *
 * This is the in-process GraphQL fetch path: `executeLocal` runs the
 * document with graphql-js against the runtime's lazily compiled schema —
 * no server, no HTTP. Relay envelopes are unwrapped here (connections →
 * plain arrays, entity references → IRI strings, prefixed URIs → full
 * IRIs), so the resolved entity is shape-identical to the SPARQL path and
 * the fetch layer is invisible to renderers, JSON output, and MCP.
 *
 * Injection safety: the resolved entity IRI enters execution EXCLUSIVELY
 * via `variableValues` — it is never interpolated into the document text,
 * which is composed only from validated pack terms and compiled schema
 * names (see {@link buildLookupDocument}).
 *
 * @param rt - The runtime (store + lazy schema).
 * @param lookup - The validated lookup declaration.
 * @param entityUri - IRI resolved by the SPARQL name→URI query (store
 *   output, not user input).
 * @param entityName - The entity's canonical stored name.
 * @param source - Pack source, for error attribution.
 * @param level - Active disclosure level (gates fields/expands at fetch).
 * @returns The unwrapped pack entity.
 * @throws PragmaError with code STORE_ERROR when execution reports errors,
 *   with code CONFIG_ERROR when the pack does not map onto the schema.
 * @note Impure — compiles the schema on first use and queries the ke store
 *   through the document's resolvers.
 */
export default async function fetchGraphqlLookupEntity(
  rt: Pick<PragmaRuntime, "store" | "graphql">,
  lookup: StoryPackLookup,
  entityUri: string,
  entityName: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
  level?: string,
): Promise<PackEntity> {
  const { schema, createContext } = await rt.graphql();
  const plan = buildLookupDocument(lookup, schema, source, level);

  const result = await executeLocal({
    schema,
    source: plan.source,
    // The IRI travels as a variable value — the graphql-js executor treats
    // it as data, so it cannot alter the document's structure.
    variableValues: { uri: entityUri },
    contextValue: createContext(rt.store),
  });

  // Generated documents never use @defer/@stream, and the schema is
  // compiled without incremental directives — a stream here is unreachable,
  // but the type demands the narrowing.
  if (isIncrementalResults(result)) {
    throw PragmaError.storeError(
      "GraphQL lookup unexpectedly produced an incremental result stream.",
    );
  }
  if (result.errors && result.errors.length > 0) {
    const messages = result.errors
      .slice(0, 3)
      .map((error) => error.message)
      .join("; ");
    throw PragmaError.storeError(`GraphQL lookup failed: ${messages}`, {
      recovery: {
        message: "Inspect the compiled schema for this graph.",
        cli: "pragma graphql check",
      },
    });
  }

  const node = (result.data as { node?: unknown } | null | undefined)?.node;
  if (node === null || node === undefined || typeof node !== "object") {
    // The SPARQL resolve found the entity, so an unresolvable node means
    // the entity's class is missing from the compiled schema (e.g. typeless
    // or ontology drift) — a graph/schema problem, not a bad name.
    throw PragmaError.storeError(
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
    if (value !== undefined) {
      entity[projection.name] = value;
    }
  }
  return entity;
}

/**
 * Unwrap one projected key: scalars to strings, entity references to full
 * IRIs, collections to arrays of child rows. Absent (null) values unwrap to
 * `undefined` and are omitted — matching the SPARQL path, where an unbound
 * OPTIONAL leaves no key on the row.
 */
function unwrapProjection(
  value: unknown,
  projection: FieldProjection,
  prefixes: Readonly<Record<string, string>>,
): string | readonly PackChildRow[] | undefined {
  switch (projection.kind) {
    case "scalar":
      return value === null || value === undefined ? undefined : String(value);
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

/** Unwrap `{ uri }` to the full IRI string (EntityValue.uri is prefixed). */
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
    if (!Array.isArray(edges)) {
      return [];
    }
    return edges
      .map((edge) => (edge as { node?: unknown }).node)
      .filter(
        (node): node is Record<string, unknown> =>
          typeof node === "object" && node !== null,
      );
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (node): node is Record<string, unknown> =>
      typeof node === "object" && node !== null,
  );
}

/**
 * Unwrap one child row. A nested expand with a single-field select
 * collapses each grandchild to that field's value (so a block's modifier
 * family carries `values: ["Dense", "Comfortable"]`, not one-key records);
 * a multi-field select keeps one record per grandchild.
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
              const leafValue =
                leaf.kind === "entity"
                  ? unwrapEntityRef(grandchild[leaf.name], prefixes)
                  : grandchild[leaf.name];
              if (leafValue !== null && leafValue !== undefined) {
                record[leaf.name] = String(leafValue);
              }
            }
            return record;
          });
      continue;
    }
    const unwrapped =
      child.kind === "entity"
        ? unwrapEntityRef(value, prefixes)
        : value === null || value === undefined
          ? undefined
          : String(value);
    if (unwrapped !== undefined) {
      row[child.name] = unwrapped;
    }
  }
  return row;
}

/**
 * Expand a prefixed URI (`ds:global`) to its full IRI using the runtime's
 * merged prefix map — ke-graphql's EntityValue identity is the prefixed
 * form, while the SPARQL path binds full IRIs; normalizing here keeps the
 * two fetch layers indistinguishable. Full IRIs and unknown prefixes pass
 * through unchanged.
 */
function expandPrefixed(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (uri.includes("://")) {
    return uri;
  }
  const colon = uri.indexOf(":");
  if (colon === -1) {
    return uri;
  }
  const namespace = prefixes[uri.slice(0, colon)];
  return namespace ? `${namespace}${uri.slice(colon + 1)}` : uri;
}
