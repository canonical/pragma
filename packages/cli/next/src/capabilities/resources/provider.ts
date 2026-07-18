/**
 * The MCP resource browser — a `pragma:{+uri}` template over the pack index.
 *
 * Listing and autocomplete are STORELESS: they read the enriched `index.json`
 * (readPackIndex) off disk, so the resource surface costs nothing until an agent
 * reads one. A read is STORE-BACKED through the SHARED {@link readEntity} — the
 * same reader `graph inspect` uses — so a resource read and a `graph inspect` of
 * the same URI return identical content (the mirror contract).
 *
 * Degradation (Risk4): on a missing or legacy (pre-v2) index the listing returns
 * a single "run `pragma sources update`" hint — never a live re-index of the
 * store on the resource path.
 *
 * The MCP SDK's `ResourceTemplate` is dynamic-imported inside `register` so this
 * module — reachable on the capabilities import graph — never pulls the SDK onto
 * the `--help`/`__complete` fast path.
 */

import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
import { readEntity } from "../../kernel/runtime/readEntity.js";
import type { McpResourceProvider } from "../../kernel/spec/types.js";

/** Max autocomplete suggestions returned for a partial URI. */
const COMPLETION_LIMIT = 50;

/** The `pragma:` URI scheme + the single reserved-expansion template variable. */
const URI_TEMPLATE = "pragma:{+uri}";

const TEMPLATE_DESCRIPTION =
  "Knowledge-graph entities from the local pack. Read any entry by its prefixed " +
  "URI (e.g. pragma:ds:button); autocomplete matches URI or label substrings. " +
  "Content mirrors `pragma graph inspect <uri>`.";

/** One resource entry in the listing. */
export interface ListedResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType: "application/json";
}

/**
 * Build the resource listing from the storeless pack index.
 *
 * @param index - The active pack index, or `undefined` when none is reachable.
 * @returns One resource per indexed entity, schema (TBox) first; a single
 *   recovery entry when the index is missing or pre-v2 (no enrichment).
 */
export function buildResourceList(
  index: PackIndex | undefined,
): ListedResource[] {
  if (!index || index.version < 2) {
    return [
      {
        uri: "pragma:sources",
        name: "Store not indexed",
        description:
          "No enriched entity index. Run `pragma sources update` to build it.",
        mimeType: "application/json",
      },
    ];
  }
  const ordered = [...index.entities].sort((a, b) => {
    const boxRank = (e: typeof a) => (e.box === "tbox" ? 0 : 1);
    return boxRank(a) - boxRank(b) || a.name.localeCompare(b.name);
  });
  return ordered.map((entity) => ({
    uri: `pragma:${entity.prefixed ?? entity.name}`,
    name: entity.label || entity.name,
    ...(entity.description ? { description: entity.description } : {}),
    mimeType: "application/json" as const,
  }));
}

/**
 * Rank URI autocomplete candidates against a partial query (case-insensitive over
 * both the prefixed URI and the label; exact > prefix > substring), capped.
 */
export function rankUriCompletions(
  entities: readonly PackIndex["entities"][number][],
  query: string,
  limit: number,
): string[] {
  const needle = query.toLowerCase();
  const score = (field: string): number =>
    field === needle
      ? 3
      : field.startsWith(needle)
        ? 2
        : field.includes(needle)
          ? 1
          : 0;
  const scored: { prefixed: string; score: number }[] = [];
  for (const entity of entities) {
    const prefixed = entity.prefixed ?? entity.name;
    const uriScore = score(prefixed.toLowerCase());
    const labelScore = entity.label ? score(entity.label.toLowerCase()) : 0;
    const best = Math.max(uriScore, labelScore);
    if (best > 0) scored.push({ prefixed, score: best });
  }
  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.prefixed.localeCompare(b.prefixed),
  );
  const seen = new Set<string>();
  const ranked: string[] = [];
  for (const { prefixed } of scored) {
    if (seen.has(prefixed)) continue;
    seen.add(prefixed);
    ranked.push(prefixed);
    if (ranked.length >= limit) break;
  }
  return ranked;
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

/** The graph-entity resource provider (registered by buildServer). */
export const resourceProvider: McpResourceProvider = {
  async register(server, runtime) {
    const { ResourceTemplate } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    const template = new ResourceTemplate(URI_TEMPLATE, {
      list: async () => ({
        resources: buildResourceList(readPackIndex(runtime.cwd)),
      }),
      complete: {
        uri: async (value: string) =>
          rankUriCompletions(
            readPackIndex(runtime.cwd)?.entities ?? [],
            value,
            COMPLETION_LIMIT,
          ),
      },
    });

    server.registerResource(
      "graph-entity",
      template,
      { description: TEMPLATE_DESCRIPTION, mimeType: "application/json" },
      async (
        url: URL,
        variables: Record<string, string | string[] | undefined>,
      ) => {
        try {
          const uri = readUriVariable(variables.uri);
          const entity = await readEntity(runtime, uri);
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
              { uri: url.href, mimeType: "text/plain", text: message },
            ],
          };
        }
      },
    );
  },
};
