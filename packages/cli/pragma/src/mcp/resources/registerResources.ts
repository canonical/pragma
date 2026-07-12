import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PragmaError } from "#error";
import resolveUri from "../../domains/graph/helpers/resolveUri.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import buildGraphIndex from "./buildGraphIndex.js";
import buildResourceList from "./buildResourceList.js";
import { COMPLETION_LIMIT } from "./constants.js";
import rankUriCompletions from "./rankUriCompletions.js";
import readEntity from "./readEntity.js";
import type { GraphIndex, ListingTruncation } from "./types.js";

/** RFC 6570 template capturing the whole (prefixed or full) URI as `uri`. */
const URI_TEMPLATE = "{+uri}";

const TEMPLATE_DESCRIPTION =
  "Knowledge-graph entities from the ke store. TBox schema (owl:Class / property " +
  "definitions) is listed first and in full; ABox individuals follow, grouped by " +
  "class and capped per class. Category and box are carried in each entry's name, " +
  "annotations.priority, and _meta. Read any entry by its prefixed URI " +
  "(e.g. ds:global.component.button); autocomplete matches URI or label substrings.";

/**
 * Report capped individuals to stderr so truncation is never silent.
 *
 * @note Impure — writes to stderr.
 */
function warnTruncation(truncation: ListingTruncation): void {
  const parts = [...truncation.droppedByType.entries()]
    .filter(([, dropped]) => dropped > 0)
    .map(([type, dropped]) => `${type}: ${dropped}`);
  process.stderr.write(
    `pragma MCP resources: capped ${truncation.totalDropped} individual(s) ` +
      `from the listing (${parts.join(", ")}); reach them via URI autocomplete ` +
      "or the graph_query tool.\n",
  );
}

/** Read the single `uri` template variable, tolerating array expansion. */
function readUriVariable(value: string | string[] | undefined): string {
  const uri = Array.isArray(value) ? value.at(0) : value;
  if (uri === undefined) {
    throw PragmaError.invalidInput("uri", String(value), {
      recovery: { message: "Provide a prefixed or full entity URI." },
    });
  }
  return uri;
}

/**
 * Register the graph-driven MCP resource surface on the server.
 *
 * One `{+uri}` template backs listing, autocomplete, and reads. The graph
 * index is built once per runtime (the store is immutable after boot) and
 * reused across calls, so autocomplete stays cheap. Listing separates TBox
 * schema from ABox individuals and caps the instance long tail; reads return
 * a box-aware payload.
 *
 * @param server - The MCP server to register resources on.
 * @param runtime - The pragma runtime providing the ke store and prefixes.
 *
 * @note Impure — registers handlers and queries the store lazily.
 */
export default function registerResources(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  const { store } = runtime;
  const prefixes = store.prefixes;

  let indexPromise: Promise<GraphIndex> | undefined;
  const getIndex = (): Promise<GraphIndex> => {
    indexPromise ??= buildGraphIndex(store, prefixes);
    return indexPromise;
  };

  const template = new ResourceTemplate(URI_TEMPLATE, {
    list: async () => {
      const index = await getIndex();
      const { resources, truncation } = buildResourceList(index);
      if (truncation.totalDropped > 0) warnTruncation(truncation);
      return { resources };
    },
    complete: {
      uri: async (value) => {
        const index = await getIndex();
        const candidates = index.entities.map((entity) => ({
          prefixed: entity.prefixed,
          label: entity.label,
        }));
        return rankUriCompletions(candidates, value, COMPLETION_LIMIT);
      },
    },
  });

  server.registerResource(
    "graph-entity",
    template,
    { description: TEMPLATE_DESCRIPTION, mimeType: "application/json" },
    async (url, variables) => {
      try {
        const prefixedUri = readUriVariable(variables.uri);
        const fullUri = resolveUri(prefixedUri, prefixes);
        const index = await getIndex();
        const entity = await readEntity(store, fullUri, prefixes, index);
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
          contents: [{ uri: url.href, mimeType: "text/plain", text: message }],
        };
      }
    },
  );
}
