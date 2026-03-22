import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import listCategories from "./categories.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listCategories", () => {
  it("returns categories with standard counts", async () => {
    const result = await listCategories(store);
    expect(result.length).toBe(2);

    const react = result.find((c) => c.name === "react");
    expect(react?.standardCount).toBe(2);

    const code = result.find((c) => c.name === "code");
    expect(code?.standardCount).toBe(1);
  });

  it("returns sorted by name", async () => {
    const result = await listCategories(store);
    const names = result.map((c) => c.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("includes categories with zero standards", async () => {
    const ttlWithEmptyCategory = `
      @prefix cs: <${PREFIX_MAP.cs}> .
      cs:empty_cat a cs:Category ; cs:slug "empty" .
      cs:filled_cat a cs:Category ; cs:slug "filled" .
      cs:s1 a cs:CodeStandard ;
        cs:name "filled/one" ;
        cs:hasCategory cs:filled_cat ;
        cs:description "A standard" .
    `;
    const { store: testStore, cleanup: testCleanup } = await createTestStore({
      ttl: ttlWithEmptyCategory,
    });
    try {
      const result = await listCategories(testStore);
      const empty = result.find((c) => c.name === "empty");
      expect(empty).toBeDefined();
      expect(empty?.standardCount).toBe(0);
      const filled = result.find((c) => c.name === "filled");
      expect(filled?.standardCount).toBe(1);
    } finally {
      testCleanup();
    }
  });
});
