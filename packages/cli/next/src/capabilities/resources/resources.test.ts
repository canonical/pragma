/**
 * The MCP resource browser (PROTECTED).
 *
 * list/autocomplete are storeless over the enriched pack index; a read is
 * store-backed and shares `graph inspect`'s entity reader (the mirror). Resources
 * never enter the emitted tool surface. On a missing/legacy index the listing
 * degrades to a `pragma sources update` hint (never a live re-index).
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
import { writeLock } from "../../kernel/runtime/lock.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { graphModule } from "../graph/index.js";
import { buildResourceList, rankUriCompletions } from "./provider.js";

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
    const index = readPackIndex(process.cwd());
    expect(index?.version).toBe(2);
    const resources = buildResourceList(index);
    expect(resources.some((r) => r.uri === "pragma:ex:Button")).toBe(true);
    // A class (tbox) sorts before an individual (abox).
    const componentIdx = resources.findIndex(
      (r) => r.uri === "pragma:ex:Component",
    );
    const buttonIdx = resources.findIndex((r) => r.uri === "pragma:ex:Button");
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
    const resources = buildResourceList(readPackIndex(process.cwd()));
    const component = resources.find((r) => r.uri === "pragma:ex:Component");
    const button = resources.find((r) => r.uri === "pragma:ex:Button");
    // A schema class: tbox, higher priority, carries its instance count.
    expect(component?._meta?.["pragma/box"]).toBe("tbox");
    expect(component?.annotations?.audience).toEqual(["assistant"]);
    expect(component?.annotations?.priority).toBe(0.9);
    expect(component?._meta?.["pragma/instanceCount"]).toBe(3);
    // An individual: abox, lower priority, no instance count.
    expect(button?._meta?.["pragma/box"]).toBe("abox");
    expect(button?.annotations?.priority).toBe(0.3);
    expect(button?._meta?.["pragma/instanceCount"]).toBeUndefined();
  });

  it("ranks autocomplete over prefixed URI and label", () => {
    const index = readPackIndex(process.cwd());
    const hits = rankUriCompletions(index?.entities ?? [], "but", 10);
    expect(hits).toContain("ex:Button");
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
    expect(resources.some((r) => r.uri === "pragma:ex:Button")).toBe(true);
    // Resources are NOT tools — the graph module's tools (inspect + the PR6
    // SPARQL escape hatch) are what appear in the tool surface.
    const tools = await harness.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "graph_inspect",
      "graph_query",
    ]);
  });

  it("autocompletes a partial URI through the template", async () => {
    const values = await harness.completeResource("But");
    expect(values).toContain("ex:Button");
  });

  it("reads an entity, mirroring `graph inspect` content", async () => {
    const read = await harness.readResource("pragma:ex:Button");
    expect(read.mimeType).toBe("application/json");
    const fromResource = JSON.parse(read.text) as InspectResult;

    // The CLI twin over the same (embedded) pack must return identical content.
    const rt = bootRuntime(TEST_FLAGS);
    const inspect = graphModule.verbs.find(
      (v) => verbKey(v.path) === "graph inspect",
    ) as VerbSpec;
    const fromCli = (await inspect.run(
      { uri: "ex:Button" },
      rt,
    )) as InspectResult;
    (await rt.store.get()).store.dispose();

    expect(fromResource).toEqual(fromCli);
    expect(fromResource.uri).toBe("https://pragma.canonical.com/sample#Button");
  });

  it("rejects a read of an absent entity as InvalidParams carrying ENTITY_NOT_FOUND", async () => {
    // The warm embedded pack resolves the `ex:` prefix but holds no `Nonexistent`
    // subject, so the read fails ENTITY_NOT_FOUND — the caller's fault, which
    // `mcpErrorFrom` maps to JSON-RPC InvalidParams, NOT the InternalError a cold
    // store (STORE_UNAVAILABLE) earns.
    const error = await harness.readResource("pragma:ex:Nonexistent").then(
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
 * entity itself were malformed. A lock pointing at an evicted pack is the cold
 * store; the read boots the store, so it must refuse with STORE_UNAVAILABLE.
 */
describe("resource read — cold-store failure surfaces isError + recovery (D3)", () => {
  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-resource-cold-"));
    writeLock(cwd, { version: 1, contentHash: "b".repeat(64), packs: [] });
    harness = await projectMcp([graphModule], cwd);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("rejects (does not return text/plain content) with the STORE_UNAVAILABLE recovery", async () => {
    const error = await harness.readResource("pragma:ex:Button").then(
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
