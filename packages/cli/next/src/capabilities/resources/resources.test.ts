/**
 * The MCP resource browser (PROTECTED).
 *
 * list/autocomplete are storeless over the enriched pack index; a read is
 * store-backed and shares `graph inspect`'s entity reader (the mirror). Resources
 * never enter the emitted tool surface. On a missing/legacy index the listing
 * degrades to a `pragma sources update` hint (never a live re-index).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PackIndex } from "../../kernel/runtime/graphpack/types.js";
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
    // Resources are NOT tools — only graph_inspect appears in the tool surface.
    const tools = await harness.listTools();
    expect(tools.map((t) => t.name)).toEqual(["graph_inspect"]);
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
});
