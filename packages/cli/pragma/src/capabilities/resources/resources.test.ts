/**
 * The MCP resource browser (PROTECTED).
 *
 * list/autocomplete are storeless over the enriched pack index; a read is
 * store-backed and shares `graph inspect`'s entity reader (the mirror). Resources
 * never enter the emitted tool surface. On a missing/legacy index the listing
 * degrades to a `pragma sources update` hint (never a live re-index).
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { graphModule } from "../graph/index.js";
import { capabilities } from "../index.js";
import {
  buildResourceList,
  rankUriCompletions,
  resourceProvider,
} from "./provider.js";

/**
 * Two entities of the committed embedded pack, chosen for what they PROVE: an
 * abox individual and the tbox class it instantiates, so the schema-before-
 * individual ordering has both sides. Named, not counted — the roster moves
 * whenever the design system does.
 */
const BUTTON_NAME = "ds:global.component.button";
const BUTTON_URI = `pragma:${BUTTON_NAME}`;
const COMPONENT_URI = "pragma:ds:Component";

/**
 * Blank out blank-node labels.
 *
 * Oxigraph re-mints blank-node identifiers every time it loads a store, so two
 * independently booted sessions over the SAME pack name the same blank node
 * differently. Those labels are store-local handles, not content — and this
 * test's subject is that both surfaces return the same CONTENT for the same
 * entity. (That the labels are not stable across processes is a real property
 * of exposing blank nodes through `graph inspect`; the toy pack this suite used
 * to run against simply had none.)
 */
const withoutBlankNodeLabels = (value: InspectResult): unknown =>
  JSON.parse(JSON.stringify(value).replace(/_:[0-9a-f]+/g, "_:b"));

describe("resource listing (storeless, over the pack index)", () => {
  it("degrades to a recovery entry on a missing or legacy index", () => {
    expect(buildResourceList(undefined)).toEqual([
      expect.objectContaining({
        uri: "pragma:sources",
        name: "Store not indexed",
      }),
    ]);
    const legacy = { version: 1, entities: [] } as unknown as PackIndex;
    expect(buildResourceList(legacy)[0]?.uri).toBe("pragma:sources");
  });

  it("lists the enriched (v2) embedded index, schema entries first", () => {
    const index = readPackIndex({ kind: "embedded" });
    expect(index?.version).toBe(2);
    const resources = buildResourceList(index);
    expect(resources.some((r) => r.uri === BUTTON_URI)).toBe(true);
    // A class (tbox) sorts before an individual (abox).
    const componentIdx = resources.findIndex((r) => r.uri === COMPONENT_URI);
    const buttonIdx = resources.findIndex((r) => r.uri === BUTTON_URI);
    expect(componentIdx).toBeLessThan(buttonIdx);
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
    const slider = buildResourceList(punned).filter(
      (r) => r.uri === "pragma:ex:Slider",
    );
    expect(slider).toHaveLength(1);
    // The retained facet is the schema (tbox) one — surfaced above individuals.
    expect(slider.at(0)?._meta?.["pragma/box"]).toBe("tbox");
  });

  it("enriches each entry with the _meta taxonomy (pragma/box + priority)", () => {
    const resources = buildResourceList(readPackIndex({ kind: "embedded" }));
    const component = resources.find((r) => r.uri === COMPONENT_URI);
    const button = resources.find((r) => r.uri === BUTTON_URI);
    // A schema class: tbox, higher priority, carries its instance count.
    expect(component?._meta?.["pragma/box"]).toBe("tbox");
    expect(component?.annotations?.audience).toEqual(["assistant"]);
    expect(component?.annotations?.priority).toBe(0.9);
    expect(component?._meta?.["pragma/instanceCount"]).toBeGreaterThan(0);
    // An individual: abox, lower priority, no instance count.
    expect(button?._meta?.["pragma/box"]).toBe("abox");
    expect(button?.annotations?.priority).toBe(0.3);
    expect(button?._meta?.["pragma/instanceCount"]).toBeUndefined();
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
      ...buildResourceList(readPackIndex({ kind: "embedded" })),
      ...buildResourceList(undefined),
    ];
    expect(listed.length).toBeGreaterThan(1);
    expect(listed.filter((r) => !r.uri.startsWith(scheme))).toEqual([]);
  });

  it("the covenant, the template, every minted URI and both _meta keys share ONE scheme (PROTECTED)", () => {
    // The wire identity is DELIBERATELY FROZEN (documented in the covenant's
    // `$comment` and in docs/mcp-integration.md): a client that stored a
    // resource URI stored an ADDRESS, so the scheme is inherited by a fork
    // rather than derived. This is what makes the freeze self-enforcing instead
    // of a convention — four independent writings, one token, derived from the
    // COVENANT so it is the published contract that decides.
    //
    // The case above already pairs the declared template with the minted URIs.
    // This adds the two writings nothing compared: the covenant entry the
    // surface publishes, and the `_meta` key namespace. PR7's defect changed
    // exactly one of these four and left the other three — that is the shape
    // this has to catch.
    //
    // WHAT IT CANNOT CATCH, stated so nobody leans on it for more: every
    // writing here is the token `pragma` under THIS distribution's identity, so
    // replacing the literal with a derivation (`` `${BIN_NAME}:{+uri}` ``)
    // leaves all four byte-identical and this case green. That is the mutation
    // the freeze exists to prevent, and it can only be seen from a fork:
    // `identity.test.ts` runs these same four checks under the name `recipes`,
    // against the covenant read from disk. Verified by making the edit — this
    // file passes, that case fails.
    const covenant = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../../surface/surface.v2.json", import.meta.url),
        ),
        "utf-8",
      ),
    ) as { mcpSurface: { resources: string[] } };
    const covenantTemplate = covenant.mcpSurface.resources[0];
    expect(covenantTemplate).toBeDefined();
    const scheme = String(covenantTemplate).split(":")[0];
    expect(scheme).toBeTruthy();

    // 1. what the live grammar emits as the surface.
    expect(emitSurface(capabilities).mcpSurface.resources).toEqual([
      covenantTemplate,
    ]);
    // 2. what `register` installs, via the provider's declared surface.
    expect(resourceProvider.surface?.templates).toEqual([covenantTemplate]);
    // 3. every URI the listing mints, including the recovery entry.
    const listed = [
      ...buildResourceList(readPackIndex({ kind: "embedded" })),
      ...buildResourceList(undefined),
    ];
    expect(listed.length).toBeGreaterThan(1);
    expect(listed.filter((r) => !r.uri.startsWith(`${scheme}:`))).toEqual([]);
    // 4. both `_meta` key namespaces, over an entry that carries each of them.
    const metaKeys = new Set(listed.flatMap((r) => Object.keys(r._meta ?? {})));
    expect(metaKeys.has(`${scheme}/box`)).toBe(true);
    expect(metaKeys.has(`${scheme}/instanceCount`)).toBe(true);
    expect([...metaKeys].filter((k) => !k.startsWith(`${scheme}/`))).toEqual(
      [],
    );
  });

  it("ranks autocomplete over prefixed URI and label", () => {
    const index = readPackIndex({ kind: "embedded" });
    const hits = rankUriCompletions(
      index?.entities ?? [],
      "global.component.button",
      10,
    );
    expect(hits).toContain(BUTTON_NAME);
  });
});

describe("resource surface over the server (embedded pack)", () => {
  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    harness = await projectMcp([graphModule]);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("registers the {+uri} template and lists resources (not tools)", async () => {
    const resources = await harness.listResources();
    expect(resources.some((r) => r.uri === BUTTON_URI)).toBe(true);
    // Resources are NOT tools — the graph module's tools (inspect + the PR6
    // SPARQL escape hatch) are what appear in the tool surface.
    const tools = await harness.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "graph_inspect",
      "graph_query",
    ]);
  });

  it("autocompletes a partial URI through the template", async () => {
    const values = await harness.completeResource("global.component.butt");
    expect(values).toContain(BUTTON_NAME);
  });

  it("reads an entity, mirroring `graph inspect` content", async () => {
    const read = await harness.readResource(BUTTON_URI);
    expect(read.mimeType).toBe("application/json");
    const fromResource = JSON.parse(read.text) as InspectResult;

    // The CLI twin over the same (embedded) pack must return identical content.
    const rt = bootRuntime(TEST_FLAGS);
    const inspect = graphModule.verbs.find(
      (v) => verbKey(v.path) === "graph inspect",
    ) as VerbSpec;
    const fromCli = (await inspect.run(
      { uri: BUTTON_NAME },
      rt,
    )) as InspectResult;
    (await rt.store.get()).store.dispose();

    expect(withoutBlankNodeLabels(fromResource)).toEqual(
      withoutBlankNodeLabels(fromCli),
    );
    expect(fromResource.uri).toBe(
      "https://ds.canonical.com/global.component.button",
    );
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
    harness = await projectMcp([graphModule], cwd);
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
});
