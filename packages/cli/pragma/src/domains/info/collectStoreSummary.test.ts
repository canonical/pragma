import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Store } from "@canonical/ke";
import { createTestStore } from "../../../testing/store.js";
import { DS_ONTOLOGY_TTL, DS_TIERS_TTL } from "../../../testing/dsFixtures.js";
import { collectStoreSummary } from "./collectStoreSummary.js";

describe("collectStoreSummary", () => {
  describe("with default graph only", () => {
    let store: Store;
    let cleanup: () => void;

    beforeAll(async () => {
      const result = await createTestStore({
        ttl: [DS_ONTOLOGY_TTL, DS_TIERS_TTL].join("\n"),
      });
      store = result.store;
      cleanup = result.cleanup;
    });

    afterAll(() => {
      cleanup();
    });

    it("returns a positive triple count", async () => {
      const summary = await collectStoreSummary(store);
      expect(summary.tripleCount).toBeGreaterThan(0);
    });

    it("returns empty graph names when no named graphs", async () => {
      const summary = await collectStoreSummary(store);
      expect(summary.graphNames).toEqual([]);
    });
  });

  describe("with named graphs", () => {
    let store: Store;
    let cleanup: () => void;

    beforeAll(async () => {
      const result = await createTestStore({
        ttl: DS_ONTOLOGY_TTL,
        graphs: [
          { graph: "urn:test:tiers", ttl: DS_TIERS_TTL },
        ],
      });
      store = result.store;
      cleanup = result.cleanup;
    });

    afterAll(() => {
      cleanup();
    });

    it("returns triple count including named graphs", async () => {
      const summary = await collectStoreSummary(store);
      expect(summary.tripleCount).toBeGreaterThan(0);
    });

    it("lists named graph URIs", async () => {
      const summary = await collectStoreSummary(store);
      expect(summary.graphNames).toContain("urn:test:tiers");
    });
  });
});
