/**
 * The MCP resource browser (PROTECTED).
 *
 * list/autocomplete are storeless over the enriched pack index; a read is
 * store-backed and shares `graph inspect`'s entity reader (the mirror). Resources
 * never enter the emitted tool surface. On a missing/legacy index the listing
 * degrades to a `pragma sources update` hint (never a live re-index) — and that
 * hint is itself readable.
 *
 * The listing is CURATED, not paged: the SDK's `McpServer` list handler ignores
 * `cursor` and never returns `nextCursor`, so everything listed is sent on every
 * connect. A module declares the SLICES of the index it contributes and the
 * listing is their union — collections and schema, not 712 individuals.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import type { McpListable, VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { graphModule } from "../graph/index.js";
import { capabilities } from "../index.js";
import { ontologyModule } from "../ontology/index.js";
import {
  buildResourceList,
  collectListable,
  completionWeights,
  rankUriCompletions,
  resourceProvider,
} from "./provider.js";

/**
 * Two entities of the committed embedded pack, chosen for what they PROVE: an
 * abox individual and the tbox class it instantiates, so the collection-vs-
 * individual split has both sides. Named, not counted — the roster moves
 * whenever the design system does.
 */
const BUTTON_NAME = "ds:global.component.button";
const BUTTON_URI = `pragma:${BUTTON_NAME}`;
const COMPONENT_URI = "pragma:ds:Component";

/** The distribution's own declared listing — the union every module contributes. */
const declaredListing = (): McpListable => collectListable(capabilities);

/** Every entity in the index, whatever its type — the widest possible slice. */
const EVERYTHING: McpListable = { sources: [{ as: "entities" }] };

/**
 * The listing budget, in bytes of the `resources/list` payload.
 *
 * `BUDGETS.md` documents an "MCP p95 (warm) < 100 ms" target that no test
 * enforces — the perf pass spawns `dist/src/bin.js` and measures CLI latency
 * only. Payload SIZE is the property that actually regressed (712 entries /
 * ~155 KB on every connect), and it is the one an agent pays for twice: once in
 * transfer, once in the context window it can no longer spend on the task.
 */
const LISTING_BUDGET_BYTES = 60_000;

describe("resource listing (storeless, over the pack index)", () => {
  it("degrades to a recovery entry on a missing or legacy index", () => {
    expect(buildResourceList(undefined, declaredListing())).toEqual([
      expect.objectContaining({
        uri: "pragma:sources",
        title: "Store not indexed",
      }),
    ]);
    const legacy = { version: 1, entities: [] } as unknown as PackIndex;
    expect(buildResourceList(legacy, declaredListing())[0]?.uri).toBe(
      "pragma:sources",
    );
  });

  it("lists the declared COLLECTIONS with their counts, not the individuals", () => {
    const index = readPackIndex({ kind: "embedded" });
    expect(index?.version).toBe(2);
    const resources = buildResourceList(index, declaredListing());

    // The collection entry for `ds:Component` is listed, carrying the count of
    // its individuals — one entry standing in for 110.
    const component = resources.find((r) => r.uri === COMPONENT_URI);
    expect(component?._meta?.["pragma/instanceCount"]).toBe(
      index?.instanceCountByType["https://ds.canonical.com/Component"],
    );
    // The individuals themselves are NOT listed — they stay reachable through
    // the `{+uri}` template and its autocomplete.
    expect(resources.some((r) => r.uri === BUTTON_URI)).toBe(false);
    // ...and the listing is a fraction of the index it summarizes.
    expect(resources.length).toBeLessThan((index?.entities.length ?? 0) / 4);
  });

  it("keeps the whole listing inside the payload budget", () => {
    const resources = buildResourceList(
      readPackIndex({ kind: "embedded" }),
      declaredListing(),
    );
    // UTF-8 BYTES, not `String.length`'s UTF-16 code units: the budget is about
    // what crosses the wire, and a graph with non-ASCII labels would otherwise
    // blow the ceiling while this assertion still passed.
    const bytes = Buffer.byteLength(JSON.stringify({ resources }), "utf8");
    expect(
      bytes,
      `resources/list payload is ${bytes} bytes — every connect spends it`,
    ).toBeLessThan(LISTING_BUDGET_BYTES);
  });

  it("DERIVES a story's collection from the types its lookup declares", () => {
    // The proof that this is derived, not agreed: the block story is compiled
    // from `pragma.conf.ts` and its module authors NO listing — the four types
    // its lookup constrains its name resolve to are the four collections it
    // contributes. Read from the compiled module, so a hand-written listing
    // that merely happens to match today cannot satisfy it.
    const block = capabilities.find((module) => module.name === "block");
    const declaredTypes = (block?.mcpListable?.sources ?? []).map(
      (source) => source.type,
    );
    expect(declaredTypes).toEqual([
      "ds:Component",
      "ds:Pattern",
      "ds:Layout",
      "ds:Subcomponent",
    ]);
    // ...and each of those reaches the listing as a collection entry.
    const resources = buildResourceList(
      readPackIndex({ kind: "embedded" }),
      collectListable([block ?? { name: "none", verbs: [] }]),
    );
    expect(resources.map((r) => r.name).sort()).toEqual([
      "ds:Component",
      "ds:Layout",
      "ds:Pattern",
      "ds:Subcomponent",
    ]);
  });

  it("contributes NOTHING for a declared type the index does not know", () => {
    // `ds:Token` is declared by the token read story but SPARQL-served, never
    // indexed. An empty collection would advertise a browse with nothing to
    // show, so the slice yields no entry at all.
    const index = readPackIndex({ kind: "embedded" });
    expect(
      index?.entities.some((e) => (e.prefixed ?? e.name) === "ds:Token"),
    ).toBe(false);
    const listed = buildResourceList(index, {
      sources: [{ type: "ds:Token", as: "collection" }],
    });
    expect(listed).toEqual([]);
  });

  it("emits ONE resource per URI for an OWL-punned subject (A8)", () => {
    // A punned subject (a class IRI also asserted as an individual) is indexed
    // as TWO facets — tbox + abox — sharing one prefixed URI. The listing must
    // dedup them so the MCP resource surface carries no duplicate URI. The abox
    // facet is listed first here to prove the dedup relies on the schema-first
    // SORT, not input order.
    const punned: PackIndex = {
      version: 2,
      contentHash: "test",
      prefixes: {},
      entities: [
        {
          name: "ex:Slider",
          type: "ex:Category",
          uri: "https://ex.test/#Slider",
          prefixed: "ex:Slider",
          types: ["owl:Class", "ex:Category"],
          label: "Slider",
          box: "abox",
          description: null,
        },
        {
          name: "ex:Slider",
          type: "owl:Class",
          uri: "https://ex.test/#Slider",
          prefixed: "ex:Slider",
          types: ["owl:Class", "ex:Category"],
          label: "Slider",
          box: "tbox",
          description: null,
        },
      ],
      instanceCountByType: {},
    };
    const slider = buildResourceList(punned, EVERYTHING).filter(
      (r) => r.uri === "pragma:ex:Slider",
    );
    expect(slider).toHaveLength(1);
    // The retained facet is the schema (tbox) one — surfaced above individuals.
    expect(slider.at(0)?._meta?.["pragma/box"]).toBe("tbox");
  });

  it("enriches each entry with the _meta taxonomy (box + type + count)", () => {
    const resources = buildResourceList(
      readPackIndex({ kind: "embedded" }),
      declaredListing(),
    );
    const component = resources.find((r) => r.uri === COMPONENT_URI);
    expect(component?._meta?.["pragma/box"]).toBe("tbox");
    // `pragma/type` is the ADDITION: an agent can narrow the listing to a
    // family without spending a read to discover what each entry is.
    expect(component?._meta?.["pragma/type"]).toBe("owl:Class");
    expect(resources.every((r) => r._meta?.["pragma/type"])).toBe(true);
    // Both audiences: `["assistant"]` hides every resource from the human
    // picker in a client that honours the field, and browsing a design system
    // in a picker is exactly a human use case.
    expect(component?.annotations?.audience).toEqual(["user", "assistant"]);
  });

  it("names an entry by its URI and TITLES it from the index's human name", () => {
    // 383 of the 714 indexed entities carry an `altNames[0]` ("Button",
    // "FileTree") and no `rdfs:label`; before this the listing showed them as a
    // bare URI while the readable name sat unused one field away. `name` stays
    // the stable identifier, `title` is what a human reads.
    const index: PackIndex = {
      version: 2,
      contentHash: "test",
      prefixes: {},
      entities: [
        {
          name: "ex:file_tree",
          type: "ex:Widget",
          uri: "https://ex.test/#file_tree",
          prefixed: "ex:file_tree",
          label: null,
          altNames: ["FileTree"],
          box: "abox",
        },
      ],
      instanceCountByType: {},
    };
    const [entry] = buildResourceList(index, EVERYTHING);
    expect(entry?.name).toBe("ex:file_tree");
    expect(entry?.title).toBe("FileTree");
  });

  it("mints every URI in the scheme the declared template routes", () => {
    // Two writings of one decision: the template `register` installs (and the
    // covenant publishes as `mcpSurface.resources`) and the scheme every listed
    // URI carries. Nothing compared them, and a half-derivation left a fork
    // advertising `recipes:{+uri}` over a list of `pragma:` URIs — every
    // resource offered was unreadable and the readable form was unadvertised.
    // DERIVED from the declared surface, so this cannot be satisfied by two
    // literals that agree today.
    const declared = resourceProvider.surface?.templates?.[0];
    const scheme = `${declared?.split(":")[0]}:`;
    const listed = [
      ...buildResourceList(readPackIndex({ kind: "embedded" }), EVERYTHING),
      ...buildResourceList(undefined, EVERYTHING),
    ];
    expect(listed.length).toBeGreaterThan(1);
    expect(listed.filter((r) => !r.uri.startsWith(scheme))).toEqual([]);
  });
});

describe("URI completion ranking", () => {
  it("ranks autocomplete over prefixed URI and label", () => {
    const index = readPackIndex({ kind: "embedded" });
    const hits = rankUriCompletions(
      index?.entities ?? [],
      "global.component.button",
    );
    expect(hits).toContain(BUTTON_NAME);
  });

  it("sinks a lightly weighted type below every heavier one at equal match", () => {
    // The declared `weights: { "ds:Subcomponent": 0.6 }` on the block story does
    // TWO jobs, and this is the second: with ties broken alphabetically alone,
    // `ds:apps_launchpad.subcomponent.modal-content-header-close_button` and its
    // kin outranked `ds:global.component.button` for the query "button" on the
    // strength of their spelling. Read from the compiled story, not restated.
    const index = readPackIndex({ kind: "embedded" });
    const entities = index?.entities ?? [];
    const weights = completionWeights(declaredListing());
    expect(weights["ds:Subcomponent"]).toBe(0.6);
    expect(weights["ds:Component"]).toBe(1);

    const typeOf = (prefixed: string) =>
      entities.find((e) => (e.prefixed ?? e.name) === prefixed)?.type;
    const weighted = rankUriCompletions(entities, "button", weights);
    const lastComponent = weighted.findLastIndex(
      (uri) => typeOf(uri) === "ds:Component",
    );
    const firstSubcomponent = weighted.findIndex(
      (uri) => typeOf(uri) === "ds:Subcomponent",
    );
    expect(firstSubcomponent).toBeGreaterThan(lastComponent);

    // ...and the weight is what moved it: unweighted, the answer ranks lower.
    const unweighted = rankUriCompletions(entities, "button");
    expect(weighted.indexOf(BUTTON_NAME)).toBeLessThan(
      unweighted.indexOf(BUTTON_NAME),
    );
  });

  it("returns EVERY match so the SDK's total/hasMore can be honest", () => {
    // The SDK derives the wire's `total`/`hasMore` from this array
    // (`values.slice(0, 100)`, `total: length`, `hasMore: length > 100`), so a
    // cap here made a truncated answer describe itself as complete.
    const index = readPackIndex({ kind: "embedded" });
    const entities = index?.entities ?? [];
    const hits = rankUriCompletions(entities, "ds:");
    // Distinct prefixed URIs: a punned subject is two index entities sharing
    // one URI, and the ranker dedups them.
    const matching = new Set(
      entities
        .map((e) => e.prefixed ?? e.name)
        .filter((uri) => uri.startsWith("ds:")),
    );
    expect(hits.length).toBe(matching.size);
    expect(hits.length).toBeGreaterThan(100);
  });
});

describe("resource surface over the server (embedded pack)", () => {
  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    harness = await projectMcp(capabilities);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("registers the {+uri} template and lists collections (not tools)", async () => {
    const resources = await harness.listResources();
    const component = resources.find((r) => r.uri === COMPONENT_URI);
    expect(component?._meta?.["pragma/instanceCount"]).toBeGreaterThan(0);
    expect(component?.title).toBe("Component");
    // The individuals are not enumerated — autocomplete is their discovery path.
    expect(resources.some((r) => r.uri === BUTTON_URI)).toBe(false);
    // Resources are NOT tools — the graph module's tools appear in the tool
    // surface, and the resource entries never do.
    const tools = await harness.listTools();
    expect(tools.map((t) => t.name)).toContain("graph_inspect");
    expect(tools.map((t) => t.name)).not.toContain(COMPONENT_URI);
  });

  it("keeps what crosses the wire inside the payload budget", async () => {
    const resources = await harness.listResources();
    const bytes = Buffer.byteLength(JSON.stringify({ resources }), "utf8");
    expect(bytes).toBeLessThan(LISTING_BUDGET_BYTES);
  });

  it("autocompletes a partial URI through the template", async () => {
    const { values } = await harness.completeResource("global.component.butt");
    expect(values).toContain(BUTTON_NAME);
  });

  it("reports total/hasMore truthfully for a query with >100 matches", async () => {
    const result = await harness.completeResource("ds:");
    // The SDK caps the wire at 100 values; `total` must be the real match count
    // and `hasMore` must admit the truncation.
    expect(result.values.length).toBe(100);
    expect(result.total ?? 0).toBeGreaterThan(100);
    expect(result.hasMore).toBe(true);
  });

  it("serves Turtle, mirroring `graph inspect --format llm` byte for byte", async () => {
    // The mirror survives the encoding change: both surfaces serialize the SAME
    // reader through the SAME serializer, so this still fails the moment one of
    // them grows a projection the other does not have.
    const read = await harness.readResource(BUTTON_URI);
    expect(read.mimeType).toBe("text/turtle");

    const rt = bootRuntime(TEST_FLAGS);
    const inspect = graphModule.verbs.find(
      (v) => verbKey(v.path) === "graph inspect",
    ) as VerbSpec;
    const fromCli = (await inspect.run(
      { uri: BUTTON_NAME },
      rt,
    )) as InspectResult;
    (await rt.store.get()).store.dispose();

    const llm = inspect.output?.formatters?.llm;
    expect(llm).toBeDefined();
    expect(read.text).toBe(llm?.(fromCli, TEST_FLAGS));
  });

  it("emits Turtle an RDF parser accepts", async () => {
    // The point of serving `text/turtle` is that it IS Turtle. Asserted by
    // PARSING it with the same engine the store uses, not by matching shapes —
    // a document that only looks right is how a reader gets a syntax error
    // instead of an entity.
    const read = await harness.readResource(BUTTON_URI);
    const dir = mkdtempSync(join(tmpdir(), "pragma-resource-ttl-"));
    const file = join(dir, "entity.ttl");
    writeFileSync(file, read.text);

    const ke = await import("@canonical/ke");
    const store = await ke.createStore({ sources: [file] });
    const result = await store.query(
      "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }",
    );
    store.dispose();
    expect(Number(result.bindings[0]?.n ?? 0)).toBeGreaterThan(0);
  });

  it("previews a long literal rather than spending the whole body", async () => {
    // Measured: one button carried 8,572 of its 9,734 literal characters in two
    // prose fields. Serving those in full at the DEFAULT level makes every read
    // pay for documentation the reader may not have asked for.
    const read = await harness.readResource(BUTTON_URI);
    expect(read.text).toMatch(/# ds:guidelines — [\d,]+ chars, showing \d+/);
  });

  it("rejects a read of an absent entity as InvalidParams carrying ENTITY_NOT_FOUND", async () => {
    // The warm embedded pack resolves the `ds:` prefix but holds no `Nonexistent`
    // subject, so the read fails ENTITY_NOT_FOUND — the caller's fault, which
    // `mcpErrorFrom` maps to JSON-RPC InvalidParams, NOT the InternalError a cold
    // store (STORE_UNAVAILABLE) earns.
    const error = await harness.readResource("pragma:ds:Nonexistent").then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error, "the read must throw, not swallow to content").toBeDefined();
    expect((error as Error).message).toMatch(/not found/i);
    const failure = error as { code?: number; data?: { code?: string } };
    expect(failure.data?.code).toBe("ENTITY_NOT_FOUND");
    expect(failure.code).toBe(ErrorCode.InvalidParams);
    expect(failure.code).not.toBe(ErrorCode.InternalError);
  });
});

/**
 * D3 — a resource-read failure surfaces as a JSON-RPC error (the read analogue of
 * a tool result's `isError`) carrying the recovery, NOT swallowed into a
 * `text/plain` "success" body that drops the recovery and reads as though the
 * entity itself were malformed. A project that declares its own packs and has
 * never built them is the cold store — it must NOT be served the distribution's
 * embedded graph; the read boots the store, so it refuses with
 * STORE_UNAVAILABLE.
 */
describe("resource read — cold-store failure surfaces isError + recovery (D3)", () => {
  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-resource-cold-"));
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      `export default { packs: [{ name: "unbuilt", source: "file:///pragma-never-built" }] };\n`,
    );
    harness = await projectMcp([graphModule, ontologyModule], cwd);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("rejects (does not return text/plain content) with the STORE_UNAVAILABLE recovery", async () => {
    const error = await harness.readResource(BUTTON_URI).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error, "the read must throw, not swallow to content").toBeDefined();
    expect((error as Error).message).toMatch(/store unavailable/i);
    const data = (
      error as {
        data?: { code?: string; recovery?: { mcp?: { tool?: string } } };
      }
    ).data;
    expect(data?.code).toBe("STORE_UNAVAILABLE");
    expect(data?.recovery?.mcp?.tool).toBe("sources_update");
  });

  it("SERVES the one resource it advertises — `pragma:sources` reads", async () => {
    // On a cold store the recovery hint is the entire listing. It used to fail
    // `INVALID_INPUT — Invalid uri "sources"`: the only resource offered
    // refused to be read, so the explanation of the cold store was unreachable
    // from the surface that showed it.
    const listed = await harness.listResources();
    expect(listed.map((r) => r.uri)).toEqual(["pragma:sources"]);
    const read = await harness.readResource("pragma:sources");
    expect(read.text).toMatch(/sources update/);
  });
});

describe("a percent-encoded resource URI reads (PROTECTED)", () => {
  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    harness = await projectMcp([graphModule]);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("resolves the encoded form to the same entity as the plain one", async () => {
    // A client that percent-encodes the URI it puts in a `pragma:{+uri}` read is
    // not doing anything wrong, and the surface was rejecting its own advertised
    // identifiers. Asserted THROUGH the server, since that is where a client
    // meets it — the unit test on `resolveUri` cannot see the template.
    const plain = await harness.readResource("pragma:ds:Component");
    const encoded = await harness.readResource("pragma:ds%3AComponent");
    expect(encoded.text).toBe(plain.text);
  });

  it("still refuses a malformed escape as InvalidParams", async () => {
    const error = await harness.readResource("pragma:%E0%A4%A").then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error, "a malformed escape must not read as success").toBeDefined();
    expect((error as { data?: { code?: string } }).data?.code).toBe(
      "INVALID_INPUT",
    );
  });
});

describe("listing + ranking edge cases the review surfaced", () => {
  it("states zero for a declared collection whose class has no instances", () => {
    // Without a default, an empty collection carries NO `pragma/instanceCount`
    // and is indistinguishable from an entry that is not a collection at all.
    const index: PackIndex = {
      version: 2,
      contentHash: "test",
      prefixes: {},
      entities: [
        {
          name: "ex:Empty",
          type: "owl:Class",
          uri: "https://ex.test/#Empty",
          prefixed: "ex:Empty",
          types: ["owl:Class"],
          label: "Empty",
          box: "tbox",
          description: null,
        },
      ],
      instanceCountByType: {},
    };
    const listed = buildResourceList(index, {
      sources: [{ type: "ex:Empty", as: "collection" }],
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?._meta?.["pragma/instanceCount"]).toBe(0);
  });

  it("weighs an entity by every type it is declared under, not the primary one", () => {
    // `type` is one lexically chosen primary among `types`. Weighing only that
    // ignored a weight declared for a secondary type, and let ranking move when
    // an unrelated, lexically earlier type was added.
    const entity = {
      name: "ex:thing",
      type: "ex:Alpha",
      prefixed: "ex:thing",
      types: ["ex:Alpha", "ex:Demoted"],
    } as PackIndex["entities"][number];
    const rival = {
      name: "ex:thing_other",
      type: "ex:Alpha",
      prefixed: "ex:thing_other",
      types: ["ex:Alpha"],
    } as PackIndex["entities"][number];

    // Equal match quality; only the SECONDARY type's weight separates them.
    const ranked = rankUriCompletions([entity, rival], "thing", {
      "ex:Demoted": 0.2,
    });
    expect(ranked).toEqual(["ex:thing_other", "ex:thing"]);
  });
});
