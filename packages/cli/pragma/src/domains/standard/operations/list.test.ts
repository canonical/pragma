import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import listStandards from "./list.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listStandards", () => {
  it("returns all standards", async () => {
    const result = await listStandards(store);
    expect(result.length).toBe(3);
    const names = result.map((s) => s.name);
    expect(names).toContain("react/component/folder-structure");
    expect(names).toContain("react/component/props");
    expect(names).toContain("code/function/purity");
  });

  it("includes category names", async () => {
    const result = await listStandards(store);
    const folder = result.find(
      (s) => s.name === "react/component/folder-structure",
    );
    expect(folder?.category).toBe("react");
  });

  it("returns sorted by name", async () => {
    const result = await listStandards(store);
    const names = result.map((s) => s.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("filters by category", async () => {
    const result = await listStandards(store, { category: "react" });
    expect(result.length).toBe(2);
    for (const s of result) {
      expect(s.category).toBe("react");
    }
  });

  it("filters by search term in name", async () => {
    const result = await listStandards(store, { search: "folder" });
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe("react/component/folder-structure");
  });

  it("filters by search term in description", async () => {
    const result = await listStandards(store, { search: "pure" });
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe("code/function/purity");
  });

  it("returns empty for non-matching category", async () => {
    const result = await listStandards(store, { category: "nonexistent" });
    expect(result.length).toBe(0);
  });

  it("combines category and search filters", async () => {
    const result = await listStandards(store, {
      category: "react",
      search: "props",
    });
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe("react/component/props");
  });
});
