/**
 * The MCP resource browser — a `pragma:{+uri}` template over the pack index.
 *
 * Listing and autocomplete are STORELESS: they read the enriched `index.json`
 * (readPackIndex) off disk, so the resource surface costs nothing until an agent
 * reads one. They read it for the pack the BOOT DECISION names, so the listing
 * can never advertise entities whose reads then fail STORE_UNAVAILABLE. A read
 * is STORE-BACKED through the SHARED {@link readEntity} — the same reader
 * `graph inspect` uses — so a resource read and a `graph inspect` of the same
 * URI return identical content (the mirror contract).
 *
 * The listing is CURATED, not paged. MCP has a `cursor`/`nextCursor` contract
 * for `resources/list`, but the SDK's high-level `McpServer` list handler
 * ignores `request.params.cursor` and never returns a `nextCursor` (verified on
 * the wire against 1.27.1), so "list everything, the client will page it" means
 * "send everything, every connect". Listing all 712 indexed entities cost an
 * agent ~155 KB of context before it had asked a single question. So a module
 * DECLARES the slices of the index it contributes ({@link McpListable}) and the
 * listing is their union: the collections, plus the schema that describes them.
 * The individuals stay fully reachable — by the `{+uri}` template, whose
 * autocomplete still offers every one of them.
 *
 * Degradation (Risk4): on a missing or legacy (pre-v2) index the listing returns
 * a single "run `pragma sources update`" hint — never a live re-index of the
 * store on the resource path. That hint is itself READABLE (it is the only
 * resource a cold server advertises, and an advertised resource that refuses to
 * be read is worse than no resource at all).
 *
 * The MCP SDK's `ResourceTemplate` is dynamic-imported inside `register` so this
 * module — reachable on the capabilities import graph — never pulls the SDK onto
 * the `--help`/`__complete` fast path.
 */

import { BIN_NAME } from "../../constants.js";
import {
  matchesType,
  readPackIndex,
} from "../../kernel/completion/entitySource.js";
import { asPragmaError } from "../../kernel/error/fromTaskError.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { mcpErrorFrom } from "../../kernel/project/mcp/mcpError.js";
import { toTurtle } from "../../kernel/render/turtle.js";
import type {
  PackIndex,
  PackIndexEntity,
} from "../../kernel/runtime/graphpack/types.js";
import { readEntity } from "../../kernel/runtime/readEntity.js";
import { resolveSources } from "../../kernel/runtime/resolveSources.js";
import type {
  CapabilityModule,
  McpListable,
  McpListableRef,
  McpResourceProvider,
} from "../../kernel/spec/types.js";

/**
 * The weight an unweighted slice carries — "as important as any other".
 *
 * The ONLY editorial number left in this module. The judgements that used to
 * live here as `CLASS_PRIORITY = 0.9` / `INDIVIDUAL_PRIORITY = 0.3` are now
 * declared data (`McpListableRef.weight`, derived from `PackLookup.weights`):
 * which of a distribution's classes deserves an agent's attention first is a
 * fact about that distribution's graph, not about the kernel that serves it.
 */
const DEFAULT_WEIGHT = 1;

/** The reserved listing entry that explains an unusable store. */
const SOURCES_URI = "pragma:sources";
/** The `{+uri}` variable value that addresses {@link SOURCES_URI}. */
const SOURCES_VARIABLE = "sources";

/**
 * The media type an entity read RETURNS — and therefore the one the listing
 * ADVERTISES for every entry it mints.
 *
 * One constant, three readers (the template registration, the read body, and
 * each listed entry). The listing promising `application/json` while the read
 * answers Turtle is the same shape of failure as the `recipes:{+uri}` template
 * over `pragma:` URIs: a surface describing content it does not serve.
 */
const ENTITY_MIME_TYPE = "text/turtle";
/** The recovery hint is prose about a broken store, not graph content. */
const RECOVERY_MIME_TYPE = "text/plain";

/**
 * The `pragma:` URI scheme + the single reserved-expansion template variable.
 *
 * A LITERAL, and it must stay one until the wire identifiers move together.
 * `surface/surface.v2.json` freezes `pragma:{+uri}` as protocol identity, and
 * `buildResourceList` mints `pragma:<prefixed>` for every entry it lists —
 * three writings of one decision. Deriving only this one made a fork advertise
 * `recipes:{+uri}` over a list of 653 `pragma:` URIs: every resource the server
 * offered became unreadable, and the readable form was never advertised.
 * `resources.test.ts` pins the pair through {@link resourceProvider}'s declared
 * surface; `identity.test.ts` masks this template out of its leak scan for the
 * same reason.
 */
const URI_TEMPLATE = "pragma:{+uri}";

const TEMPLATE_DESCRIPTION =
  "Knowledge-graph entities from the local pack, as Turtle. Read any entry by " +
  "its prefixed URI (e.g. pragma:ds:global.component.button); autocomplete " +
  "matches URI or label substrings. A read returns the entity's neighbourhood — " +
  "its own triples, the edges pointing AT it, and its blank nodes inlined. " +
  `Content mirrors \`${BIN_NAME} graph inspect <uri> --format llm\`.`;

/** Agent-navigability annotations mirrored onto a listed resource. */
export interface ResourceAnnotations {
  /** MCP audience roles (the SDK's literal union). */
  readonly audience: ("user" | "assistant")[];
  /** The declared weight of the slice that contributed this entry (0–1). */
  readonly priority: number;
}

/**
 * The audience every listed resource carries.
 *
 * BOTH roles. `["assistant"]` tells a client that honours the field to hide the
 * resource from its human picker, and browsing a design system in a picker is
 * exactly a human use case — the same entries serve an agent orienting itself
 * and a person looking for the button spec.
 */
const LISTING_AUDIENCE: ("user" | "assistant")[] = ["user", "assistant"];

/** One resource entry in the listing. */
export interface ListedResource {
  readonly uri: string;
  /** The STABLE prefixed URI (`ds:Component`) — an identifier, not a label. */
  readonly name: string;
  /** The human label (MCP `title`), when the index carries one. */
  readonly title?: string;
  readonly description?: string;
  readonly mimeType: typeof ENTITY_MIME_TYPE | typeof RECOVERY_MIME_TYPE;
  /** Audience + the declared weight of the slice that listed it. */
  readonly annotations?: ResourceAnnotations;
  /** Taxonomy metadata: `pragma/box`, `pragma/type`, optional instance count. */
  readonly _meta?: Record<string, unknown>;
}

/**
 * The human name for an entity, best-available-first.
 *
 * `altNames` is the distribution's declared alternative-name property — the
 * name a bespoke lookup MATCHES on ("Button", "FileTree"). 383 of the embedded
 * pack's 714 entities carry one and no `rdfs:label`, so before this the listing
 * showed them as a bare URI with no description while the readable name sat
 * unused in the index one field away.
 */
function humanName(entity: PackIndexEntity): string | undefined {
  return entity.label ?? entity.altNames?.[0] ?? undefined;
}

/** Render one index entity as a listed resource at a given weight. */
function listEntity(
  entity: PackIndexEntity,
  weight: number,
  instanceCount?: number,
): ListedResource {
  const title = humanName(entity);
  // `pragma/box` + `pragma/instanceCount` are FROZEN protocol identity (see
  // `surface.v2.json` and docs/mcp-integration.md). `pragma/type` is an
  // ADDITION: all 714 entities carry a type, and publishing it lets an agent
  // narrow the listing to a family without spending a read to find out what
  // each entry is.
  const meta: Record<string, unknown> = {
    "pragma/box": entity.box ?? "abox",
    "pragma/type": entity.type,
  };
  if (typeof instanceCount === "number") {
    meta["pragma/instanceCount"] = instanceCount;
  }
  return {
    uri: `pragma:${entity.prefixed ?? entity.name}`,
    name: entity.prefixed ?? entity.name,
    ...(title ? { title } : {}),
    ...(entity.description ? { description: entity.description } : {}),
    mimeType: ENTITY_MIME_TYPE,
    annotations: { audience: LISTING_AUDIENCE, priority: weight },
    _meta: meta,
  };
}

/** The recovery entry a missing/legacy index degrades to (and its read body). */
const SOURCES_RECOVERY = `No enriched entity index. Run \`${BIN_NAME} sources update\` to build it.`;

/** The single entry a server with no usable index advertises. */
function sourcesEntry(): ListedResource {
  return {
    uri: SOURCES_URI,
    name: SOURCES_VARIABLE,
    title: "Store not indexed",
    description: SOURCES_RECOVERY,
    mimeType: RECOVERY_MIME_TYPE,
  };
}

/**
 * Resolve one declared slice into listed resources.
 *
 * `as: "collection"` yields at most ONE entry — the class entry for the slice's
 * type, carrying `pragma/instanceCount`. A type the index does not know
 * contributes NOTHING rather than an empty collection: `ds:Token` is declared by
 * a read story but SPARQL-served, never indexed, and advertising an empty
 * collection for it would promise a browse that has nothing to show.
 */
function listSlice(
  index: PackIndex,
  byPrefixed: ReadonlyMap<string, PackIndexEntity>,
  ref: McpListableRef,
): ListedResource[] {
  const weight = ref.weight ?? DEFAULT_WEIGHT;
  if (ref.as === "collection") {
    const type = ref.type;
    if (!type) return [];
    const entity = byPrefixed.get(type);
    if (!entity) return [];
    const count = entity.uri
      ? index.instanceCountByType[entity.uri]
      : undefined;
    return [listEntity(entity, weight, count)];
  }
  const listed: ListedResource[] = [];
  for (const entity of index.entities) {
    if (ref.box && (entity.box ?? "abox") !== ref.box) continue;
    if (!matchesType(entity, ref.type ?? "")) continue;
    const count =
      entity.box === "tbox" && entity.uri
        ? index.instanceCountByType[entity.uri]
        : undefined;
    listed.push(listEntity(entity, weight, count));
  }
  return listed;
}

/**
 * Build the resource listing from the storeless pack index.
 *
 * @param index - The active pack index, or `undefined` when none is reachable.
 * @param listing - The union of the modules' declared slices.
 * @returns One resource per contributed entry, heaviest slice first; a single
 *   recovery entry when the index is missing or pre-v2 (no enrichment).
 */
export function buildResourceList(
  index: PackIndex | undefined,
  listing: McpListable,
): ListedResource[] {
  // readPackIndex returns raw JSON.parse output (no zod), so guard structurally:
  // a malformed index missing `version` must degrade to the recovery hint, not
  // fall through to `[...index.entities]` (a TypeError inside the MCP handler).
  if (!index || index.version !== 2 || !Array.isArray(index.entities)) {
    return [sourcesEntry()];
  }
  const byPrefixed = new Map<string, PackIndexEntity>();
  for (const entity of index.entities) {
    const key = entity.prefixed ?? entity.name;
    // A punned subject is indexed as two facets sharing one key; the schema
    // facet is the one a collection entry means.
    if (!byPrefixed.has(key) || entity.box === "tbox")
      byPrefixed.set(key, entity);
  }
  const candidates = listing.sources.flatMap((ref) =>
    listSlice(index, byPrefixed, ref),
  );
  candidates.sort((a, b) => {
    const priority = (r: ListedResource) => r.annotations?.priority ?? 0;
    const boxRank = (r: ListedResource) =>
      r._meta?.["pragma/box"] === "tbox" ? 0 : 1;
    return (
      priority(b) - priority(a) ||
      boxRank(a) - boxRank(b) ||
      a.uri.localeCompare(b.uri)
    );
  });
  // Dedup by resource URI. Two slices may contribute the same entry (a story's
  // collection IS one of the ontology's schema entries), and an OWL-punned
  // subject (a class/property IRI ALSO asserted as a domain individual) is
  // indexed as TWO entities — a tbox and an abox facet — that compact to the
  // SAME `pragma:<uri>` (A8). The sort above puts the heavier slice, then the
  // tbox facet, first, so keeping the first occurrence per URI surfaces the
  // richer entry (its instance count and higher priority) and drops the rest.
  const seen = new Set<string>();
  const resources: ListedResource[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.uri)) continue;
    seen.add(candidate.uri);
    resources.push(candidate);
  }
  return resources;
}

/**
 * The per-type ranking weights a declared listing implies.
 *
 * A slice that names a `type` is an opinion about that type's importance, and
 * the SAME opinion should decide both what the listing surfaces first and what
 * autocomplete offers first — one declaration, two readers. A slice that names
 * only a `box` carries no opinion about a candidate URI, so it contributes none.
 *
 * @param listing - The union of the modules' declared slices.
 * @returns Prefixed type → weight (heaviest declaration wins on a repeat).
 */
export function completionWeights(
  listing: McpListable,
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const ref of listing.sources) {
    if (!ref.type) continue;
    const weight = ref.weight ?? DEFAULT_WEIGHT;
    weights[ref.type] = Math.max(weights[ref.type] ?? 0, weight);
  }
  return weights;
}

/**
 * Rank URI autocomplete candidates against a partial query (case-insensitive
 * over both the prefixed URI and the label; exact > prefix > substring).
 *
 * UNCAPPED on purpose. The SDK derives the wire's `total`/`hasMore` from the
 * array this returns — it slices to 100, reports `total: values.length` and
 * `hasMore: values.length > 100` — so pre-truncating here made a truncated
 * result describe itself as complete: `ds:` answered
 * `{ values: 50, total: 50, hasMore: false }` while 499 entities matched.
 * Completion keeps offering EVERY entity: it is the discovery path for the
 * individuals the curated listing no longer enumerates.
 *
 * @param entities - The index entities to rank.
 * @param query - The partial the agent typed.
 * @param weights - Prefixed type → weight, breaking ties between equal matches.
 * @returns Every matching prefixed URI, best first.
 */
export function rankUriCompletions(
  entities: readonly PackIndexEntity[],
  query: string,
  weights: Readonly<Record<string, number>> = {},
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
  const scored: { prefixed: string; score: number; weight: number }[] = [];
  for (const entity of entities) {
    const prefixed = entity.prefixed ?? entity.name;
    const uriScore = score(prefixed.toLowerCase());
    const labelScore = entity.label ? score(entity.label.toLowerCase()) : 0;
    const best = Math.max(uriScore, labelScore);
    if (best > 0) {
      scored.push({
        prefixed,
        score: best,
        weight: weights[entity.type] ?? DEFAULT_WEIGHT,
      });
    }
  }
  // Match quality first, then the DECLARED weight, then the alphabet. The
  // weight step is what stops 86 `…-close_button` subcomponents from burying
  // `ds:global.component.button` on the strength of their spelling alone.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.weight - a.weight ||
      a.prefixed.localeCompare(b.prefixed),
  );
  const seen = new Set<string>();
  const ranked: string[] = [];
  for (const { prefixed } of scored) {
    if (seen.has(prefixed)) continue;
    seen.add(prefixed);
    ranked.push(prefixed);
  }
  return ranked;
}

/**
 * The union of every module's declared listing.
 *
 * @param modules - The effective capability modules.
 * @returns One listing holding every declared slice, in module order.
 */
export function collectListable(
  modules: readonly CapabilityModule[],
): McpListable {
  return {
    sources: modules.flatMap((module) => module.mcpListable?.sources ?? []),
  };
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
  async register(server, runtime, modules) {
    const { ResourceTemplate } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    const { McpError, ErrorCode } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
    // The index of the pack the boot decision names — `undefined` when the
    // store is unavailable, which `buildResourceList` renders as the recovery
    // entry rather than a catalogue of unreadable URIs.
    const activeIndex = async (): Promise<PackIndex | undefined> =>
      readPackIndex(resolveSources(await runtime.loadConfig(), runtime.cwd));
    // What the SERVER lists is the union of what its modules declare — not what
    // this one module knows. Collected once, at registration.
    const listing = collectListable(modules);
    const weights = completionWeights(listing);

    const template = new ResourceTemplate(URI_TEMPLATE, {
      list: async () => ({
        resources: buildResourceList(await activeIndex(), listing),
      }),
      complete: {
        // Uncapped: the SDK slices to 100 and derives `total`/`hasMore` from
        // the full array, so returning it is what makes those numbers honest.
        uri: async (value: string) =>
          rankUriCompletions(
            (await activeIndex())?.entities ?? [],
            value,
            weights,
          ),
      },
    });

    server.registerResource(
      "graph-entity",
      template,
      // `text/turtle` because that is what the body IS. The surface used to
      // claim `application/json` for a graph, and paid ~95 bytes of wrapper per
      // named node to do it — one button read carried ~6.1 KB of pure structure.
      // Turtle spends the prefixes once, writes each term as itself, and says
      // IRI-versus-literal in syntax rather than in a `termType` field.
      { description: TEMPLATE_DESCRIPTION, mimeType: ENTITY_MIME_TYPE },
      async (
        url: URL,
        variables: Record<string, string | string[] | undefined>,
      ) => {
        try {
          const uri = readUriVariable(variables.uri);
          // The recovery entry is a real resource, not a label. It is the ONLY
          // thing a server with no usable index advertises, and reading it used
          // to fail `INVALID_INPUT — Invalid uri "sources"`: the one resource on
          // offer refused to be read, so the hint that explains the cold store
          // was unreachable from the surface that showed it.
          if (uri === SOURCES_VARIABLE) {
            return {
              contents: [
                {
                  uri: url.href,
                  mimeType: RECOVERY_MIME_TYPE,
                  text: SOURCES_RECOVERY,
                },
              ],
            };
          }
          const entity = await readEntity(runtime, uri);
          const { prefixes } = await runtime.store.get();
          return {
            contents: [
              {
                uri: url.href,
                mimeType: ENTITY_MIME_TYPE,
                text: toTurtle(entity, prefixes),
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
