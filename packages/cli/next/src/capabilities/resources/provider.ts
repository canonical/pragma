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
import { asPragmaError } from "../../kernel/error/fromTaskError.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { mcpErrorFrom } from "../../kernel/project/mcp/mcpError.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
import { readEntity } from "../../kernel/runtime/readEntity.js";
import type { McpResourceProvider } from "../../kernel/spec/types.js";

/** Max autocomplete suggestions returned for a partial URI. */
const COMPLETION_LIMIT = 50;

/** MCP annotation priority for a schema (TBox) entry — surfaced above individuals. */
const CLASS_PRIORITY = 0.9;
/** MCP annotation priority for an individual (ABox) entry. */
const INDIVIDUAL_PRIORITY = 0.3;

/** The `pragma:` URI scheme + the single reserved-expansion template variable. */
const URI_TEMPLATE = "pragma:{+uri}";

const TEMPLATE_DESCRIPTION =
  "Knowledge-graph entities from the local pack. Read any entry by its prefixed " +
  "URI (e.g. pragma:ds:button); autocomplete matches URI or label substrings. " +
  "Content mirrors `pragma graph inspect <uri>`.";

/** Agent-navigability annotations mirrored onto a listed resource. */
export interface ResourceAnnotations {
  /** MCP audience roles (the SDK's literal union) — always the assistant here. */
  readonly audience: ("user" | "assistant")[];
  readonly priority: number;
}

/** The audience every listed resource carries (assistant-facing). */
const ASSISTANT_AUDIENCE: ("user" | "assistant")[] = ["assistant"];

/** One resource entry in the listing. */
export interface ListedResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType: "application/json";
  /** Audience + priority (schema surfaced above individuals). */
  readonly annotations?: ResourceAnnotations;
  /** Taxonomy metadata: `pragma/box` (tbox|abox) + optional instance count. */
  readonly _meta?: Record<string, unknown>;
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
  // readPackIndex returns raw JSON.parse output (no zod), so guard structurally:
  // a malformed index missing `version` must degrade to the recovery hint, not
  // fall through to `[...index.entities]` (a TypeError inside the MCP handler).
  if (!index || index.version !== 2 || !Array.isArray(index.entities)) {
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
  // Dedup by resource URI: an OWL-punned subject (a class/property IRI ALSO
  // asserted as a domain individual) is indexed as TWO entities — a tbox and an
  // abox facet — that compact to the SAME `pragma:<uri>`. Mapping both would
  // list one URI twice (A8). The sort above puts the tbox facet first, so
  // keeping the first occurrence per URI surfaces the schema facet (its higher
  // priority + instance count) and drops the punned duplicate.
  const seen = new Set<string>();
  const resources: ListedResource[] = [];
  for (const entity of ordered) {
    const uri = `pragma:${entity.prefixed ?? entity.name}`;
    if (seen.has(uri)) continue;
    seen.add(uri);
    const isTbox = entity.box === "tbox";
    // Port of the old shell's `_meta` taxonomy: `pragma/box` + a priority that
    // ranks schema (classes/properties) above individuals, so an agent browsing
    // the resource list sees the schema first. `pragma/instanceCount` is the
    // per-type count carried in the index for a TBox class entry.
    // `instanceCountByType` is keyed by the full type IRI; a TBox class entry's
    // own IRI is that key, so it carries the count of its individuals.
    const instanceCount =
      isTbox && entity.uri ? index.instanceCountByType[entity.uri] : undefined;
    const meta: Record<string, unknown> = {
      "pragma/box": entity.box ?? "abox",
    };
    if (typeof instanceCount === "number") {
      meta["pragma/instanceCount"] = instanceCount;
    }
    resources.push({
      uri,
      name: entity.label || entity.name,
      ...(entity.description ? { description: entity.description } : {}),
      mimeType: "application/json" as const,
      annotations: {
        audience: ASSISTANT_AUDIENCE,
        priority: isTbox ? CLASS_PRIORITY : INDIVIDUAL_PRIORITY,
      },
      _meta: meta,
    });
  }
  return resources;
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
  // The single authoring point for the template id — the surface emitter reads
  // this so `mcpSurface.resources` cannot drift from what `register` installs.
  surface: { templates: [URI_TEMPLATE] },
  async register(server, runtime) {
    const { ResourceTemplate } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    const { McpError, ErrorCode } = await import(
      "@modelcontextprotocol/sdk/types.js"
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
          // Surface the failure as a JSON-RPC error (the resource-read analogue
          // of a tool result's `isError`), preserving the machine code AND the
          // recovery in `data` — never swallow it into `text/plain` content an
          // agent reads as a successful entity (which dropped the recovery and
          // masked a cold store as though the entity itself were malformed).
          throw mcpErrorFrom(asPragmaError(error), { McpError, ErrorCode });
        }
      },
    );
  },
};
