import type { Store } from "@canonical/ke";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PragmaError } from "#error";
import { PROPERTY_MAP } from "../constants.js";
import resolveUri from "../domains/graph/helpers/resolveUri.js";
import { buildQuery } from "../domains/shared/buildQuery.js";
import compactUri from "../domains/shared/compactUri.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";

// =============================================================================
// Types
// =============================================================================

interface PropertyValueLiteral {
  readonly type: "literal";
  readonly value: string;
  readonly datatype?: string;
}

interface PropertyValueUri {
  readonly type: "uri";
  readonly uri: string;
  readonly prefixed: string;
  readonly label: string | null;
}

type PropertyValue = PropertyValueLiteral | PropertyValueUri;

interface PropertyGroup {
  readonly predicate: string;
  readonly values: PropertyValue[];
}

interface ResourceEntity {
  readonly uri: string;
  readonly prefixed: string;
  readonly types: string[];
  readonly label: string | null;
  readonly description: string | null;
  readonly properties: PropertyGroup[];
}

// =============================================================================
// Helpers
// =============================================================================

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/**
 * Determine the namespace prefix for a full URI.
 */
function findPrefix(
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): string | null {
  for (const [prefix, namespace] of Object.entries(prefixes)) {
    if (fullUri.startsWith(namespace)) return prefix;
  }
  return null;
}

/**
 * Fetch a single property value for a URI using the PROPERTY_MAP.
 */
async function fetchProperty(
  store: Store,
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
  field: "label" | "description",
): Promise<string | null> {
  const prefix = findPrefix(fullUri, prefixes);
  if (!prefix) return null;

  const propUri = PROPERTY_MAP[prefix]?.[field];
  if (!propUri) return null;

  const result = await store.query(
    buildQuery(`
      SELECT ?val
      WHERE { <${fullUri}> <${propUri}> ?val }
      LIMIT 1
    `),
  );

  if (result.type === "select" && result.bindings.length > 0) {
    return result.bindings[0]?.val ?? null;
  }
  return null;
}

/**
 * Fetch the human-readable label for a URI using the PROPERTY_MAP.
 */
async function fetchLabel(
  store: Store,
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): Promise<string | null> {
  return fetchProperty(store, fullUri, prefixes, "label");
}

/**
 * Fetch the human-readable description for a URI using the PROPERTY_MAP.
 */
async function fetchDescription(
  store: Store,
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): Promise<string | null> {
  return fetchProperty(store, fullUri, prefixes, "description");
}

/**
 * Detect whether a SPARQL binding value is a URI or a literal.
 * URIs start with http:// or https:// or are prefixed; literals are everything else.
 */
function isUri(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("urn:")
  );
}

/**
 * Enumerate all distinct subject URIs in the graph.
 */
async function listAllSubjects(store: Store): Promise<string[]> {
  const result = await store.query(
    buildQuery("SELECT DISTINCT ?s WHERE { ?s ?p ?o } ORDER BY ?s"),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => b.s ?? "").filter((s) => isUri(s));
}

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

/**
 * Fetch the rdfs:label of the entity's rdf:type class.
 *
 * Returns the label of the first typed class that has one, or null.
 */
async function fetchTypeLabel(
  store: Store,
  fullUri: string,
): Promise<string | null> {
  const result = await store.query(
    buildQuery(`
      SELECT ?typeLabel
      WHERE {
        <${fullUri}> <${RDF_TYPE}> ?type .
        ?type <${RDFS_LABEL}> ?typeLabel .
      }
      LIMIT 1
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) return null;
  return result.bindings[0]?.typeLabel ?? null;
}

/**
 * Build a resource description from type label and graph description.
 *
 * Produces: "Component — Buttons are used to trigger…" or just "Component"
 * when no description exists, or just the truncated description when no
 * type is recognized.
 */
function buildResourceDescription(
  typeLabel: string | null,
  description: string | null,
): string | undefined {
  if (!typeLabel && !description) return undefined;
  const truncated =
    description && description.length > 120
      ? `${description.slice(0, 117)}...`
      : description;
  if (!typeLabel) return truncated ?? undefined;
  if (!truncated) return typeLabel;
  return `${typeLabel} — ${truncated}`;
}

/**
 * Read a single entity: all its triples with level-1 object summaries.
 */
async function readEntity(
  store: Store,
  fullUri: string,
  prefixes: Readonly<Record<string, string>>,
): Promise<ResourceEntity> {
  const result = await store.query(
    buildQuery(`
      SELECT ?p ?o
      WHERE { <${fullUri}> ?p ?o }
      ORDER BY ?p ?o
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("entity", compactUri(fullUri, prefixes), {
      recovery: {
        message:
          "Check the URI is correct and run a SPARQL query to find valid URIs.",
        cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
        mcp: { tool: "graph_query" },
      },
    });
  }

  const types: string[] = [];
  const groupMap = new Map<string, PropertyValue[]>();

  for (const b of result.bindings) {
    const predicate = b.p ?? "";
    const object = b.o ?? "";

    if (predicate === RDF_TYPE) {
      types.push(compactUri(object, prefixes));
      continue;
    }

    const compactPred = compactUri(predicate, prefixes);
    const existing = groupMap.get(compactPred) ?? [];

    if (isUri(object)) {
      const label = await fetchLabel(store, object, prefixes);
      existing.push({
        type: "uri",
        uri: object,
        prefixed: compactUri(object, prefixes),
        label,
      });
    } else {
      existing.push({ type: "literal", value: object });
    }

    groupMap.set(compactPred, existing);
  }

  const [label, description] = await Promise.all([
    fetchLabel(store, fullUri, prefixes),
    fetchDescription(store, fullUri, prefixes),
  ]);

  const properties: PropertyGroup[] = [...groupMap.entries()].map(
    ([predicate, values]) => ({ predicate, values }),
  );

  return {
    uri: fullUri,
    prefixed: compactUri(fullUri, prefixes),
    types,
    label,
    description,
    properties,
  };
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register graph-driven MCP resources on the server.
 *
 * Every subject URI in the ke graph becomes a discoverable MCP resource.
 * Reading a resource returns the entity's properties with level-1 object
 * relations resolved to summaries (label and description from PROPERTY_MAP).
 *
 * @param server - The MCP server to register resources on.
 * @param runtime - The pragma runtime providing the ke store and prefixes.
 *
 * @note Impure
 */
export default function registerResources(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  const { store } = runtime;
  const prefixes = store.prefixes;

  const template = new ResourceTemplate("{+uri}", {
    list: async () => {
      const subjects = await listAllSubjects(store);
      const resources = await Promise.all(
        subjects.map(async (fullUri) => {
          const prefixed = compactUri(fullUri, prefixes);
          const [label, typeLabel, desc] = await Promise.all([
            fetchLabel(store, fullUri, prefixes),
            fetchTypeLabel(store, fullUri),
            fetchDescription(store, fullUri, prefixes),
          ]);
          return {
            uri: prefixed,
            name: label ?? prefixed,
            description: buildResourceDescription(typeLabel, desc),
            mimeType: "application/json" as const,
            annotations: { audience: ["assistant" as const] },
          };
        }),
      );
      return { resources };
    },
    complete: {
      uri: async (value) => {
        const subjects = await listAllSubjects(store);
        const compacted = subjects.map((s) => compactUri(s, prefixes));
        return compacted.filter((p) =>
          p.toLowerCase().startsWith(value.toLowerCase()),
        );
      },
    },
  });

  server.registerResource(
    "graph-entity",
    template,
    { mimeType: "application/json" },
    async (url, variables) => {
      try {
        const prefixedUri = variables.uri as string;
        const fullUri = resolveUri(prefixedUri, prefixes);
        const entity = await readEntity(store, fullUri, prefixes);
        return {
          contents: [
            {
              uri: url.href,
              mimeType: "application/json",
              text: JSON.stringify(entity, null, 2),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof PragmaError
            ? JSON.stringify({ code: error.code, message: error.message })
            : String(error);
        return {
          contents: [
            {
              uri: url.href,
              mimeType: "text/plain",
              text: message,
            },
          ],
        };
      }
    },
  );
}
