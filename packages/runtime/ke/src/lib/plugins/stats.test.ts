import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import createTestStore from "../../../testing/createTestStore.js";
import {
  EMPTY_TTL,
  STATS_INSTANCES_TTL,
  STATS_ONTOLOGY_TTL,
} from "../../../testing/fixtures.js";
import type { TestStoreResult } from "../../../testing/types.js";
import { sparql } from "../sparql.js";
import type { SelectResult } from "../types.js";
import { STATS_GRAPH, statsPlugin } from "./stats.js";
import type { StatsApi } from "./stats.js";

describe("Stats plugin", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  async function createStatsStore() {
    testResult = await createTestStore({
      ttl: [STATS_ONTOLOGY_TTL, STATS_INSTANCES_TTL],
      plugins: [statsPlugin()],
    });
    return testResult;
  }

  describe("direct counts", () => {
    it("counts instances typed exactly as each class", async () => {
      const { store } = await createStatsStore();
      const stats = store.api<StatsApi>("stats")!;

      expect(stats.getCount("https://ds.canonical.com/Component")!.direct).toBe(
        3,
      );
      expect(stats.getCount("https://ds.canonical.com/Pattern")!.direct).toBe(
        2,
      );
      expect(stats.getCount("https://ds.canonical.com/Layout")!.direct).toBe(1);
      expect(
        stats.getCount("https://ds.canonical.com/Subcomponent")!.direct,
      ).toBe(0);
      expect(stats.getCount("https://ds.canonical.com/UIBlock")!.direct).toBe(
        0,
      );
      expect(
        stats.getCount("https://ds.canonical.com/UIElement")!.direct,
      ).toBe(0);
    });
  });

  describe("inheritance rollup", () => {
    it("accumulates counts up the rdfs:subClassOf chain", async () => {
      const { store } = await createStatsStore();
      const stats = store.api<StatsApi>("stats")!;

      // Component (3) + Pattern (2) + Layout (1) + Subcomponent (0) = 6
      expect(stats.getCount("https://ds.canonical.com/UIBlock")!.total).toBe(6);
      // UIBlock (6) rolls up to UIElement
      expect(stats.getCount("https://ds.canonical.com/UIElement")!.total).toBe(
        6,
      );
      // Leaf classes: total === direct
      expect(stats.getCount("https://ds.canonical.com/Component")!.total).toBe(
        3,
      );
      expect(stats.getCount("https://ds.canonical.com/Pattern")!.total).toBe(2);
      expect(stats.getCount("https://ds.canonical.com/Layout")!.total).toBe(1);
      expect(
        stats.getCount("https://ds.canonical.com/Subcomponent")!.total,
      ).toBe(0);
    });
  });

  describe("SPARQL queryability", () => {
    it("stats are queryable via GRAPH clause", async () => {
      const { store } = await createStatsStore();

      const result = (await store.query(
        sparql`SELECT ?class ?total WHERE { GRAPH <urn:ke:stats> { ?class <urn:ke:stats#totalCount> ?total } }`,
      )) as SelectResult;

      expect(result.type).toBe("select");
      expect(result.bindings.length).toBeGreaterThan(0);

      const uiBlock = result.bindings.find(
        (b) => b.class === "https://ds.canonical.com/UIBlock",
      );
      expect(uiBlock).toBeDefined();
      expect(uiBlock!.total).toBe("6");
    });

    it("stats are visible without GRAPH clause (union default graph)", async () => {
      const { store } = await createStatsStore();

      const result = (await store.query(
        sparql`SELECT ?total WHERE { <https://ds.canonical.com/UIBlock> <urn:ke:stats#totalCount> ?total }`,
      )) as SelectResult;

      expect(result.bindings.length).toBe(1);
      expect(result.bindings[0]!.total).toBe("6");
    });
  });

  describe("getCounts API", () => {
    it("returns all classes sorted by total descending", async () => {
      const { store } = await createStatsStore();
      const stats = store.api<StatsApi>("stats")!;
      const counts = stats.getCounts();

      expect(counts.length).toBeGreaterThan(0);

      // Verify sorted descending by total
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i - 1]!.total).toBeGreaterThanOrEqual(counts[i]!.total);
      }
    });
  });

  describe("getCount API", () => {
    it("returns undefined for unknown class URIs", async () => {
      const { store } = await createStatsStore();
      const stats = store.api<StatsApi>("stats")!;

      expect(stats.getCount("http://example.org/DoesNotExist")).toBeUndefined();
    });
  });

  describe("reload", () => {
    it("recomputes stats after reload", async () => {
      const { store, tmpDir } = await createStatsStore();
      const stats1 = store.api<StatsApi>("stats")!;

      expect(stats1.getCount("https://ds.canonical.com/Component")!.direct).toBe(
        3,
      );

      // Add another component instance to the source file
      const filePath = join(tmpDir, "test-1.ttl");
      writeFileSync(
        filePath,
        `
@prefix ds: <https://ds.canonical.com/> .
ds:button a ds:Component .
ds:card a ds:Component .
ds:input a ds:Component .
ds:accordion a ds:Pattern .
ds:tabs a ds:Pattern .
ds:sidebar a ds:Layout .
ds:newWidget a ds:Component .
`,
        "utf-8",
      );

      await store.reload({ force: true });

      const stats2 = store.api<StatsApi>("stats")!;
      expect(stats2.getCount("https://ds.canonical.com/Component")!.direct).toBe(
        4,
      );
      expect(stats2.getCount("https://ds.canonical.com/UIBlock")!.total).toBe(7);
    });
  });

  describe("edge cases", () => {
    it("handles empty store gracefully", async () => {
      testResult = await createTestStore({
        ttl: EMPTY_TTL,
        plugins: [statsPlugin()],
      });
      const stats = testResult.store.api<StatsApi>("stats")!;

      expect(stats.getCounts()).toEqual([]);
      expect(stats.getCount("http://example.org/Anything")).toBeUndefined();
    });

    it("handles store with no hierarchy (flat classes)", async () => {
      testResult = await createTestStore({
        ttl: `
@prefix ex: <http://example.org/> .
ex:a a ex:Foo .
ex:b a ex:Foo .
ex:c a ex:Bar .
`,
        plugins: [statsPlugin()],
      });
      const stats = testResult.store.api<StatsApi>("stats")!;

      expect(stats.getCount("http://example.org/Foo")!.direct).toBe(2);
      expect(stats.getCount("http://example.org/Foo")!.total).toBe(2);
      expect(stats.getCount("http://example.org/Bar")!.direct).toBe(1);
      expect(stats.getCount("http://example.org/Bar")!.total).toBe(1);
    });
  });
});
