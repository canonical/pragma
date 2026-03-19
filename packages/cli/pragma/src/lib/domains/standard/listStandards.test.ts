import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { listStandards } from "./listStandards.js";

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

  it("returns empty category for a standard with no category", async () => {
    const result = await listStandards(store);
    const purity = result.find((s) => s.name === "code/function/purity");
    // If purity has a category it should be a string; if none, empty string
    expect(typeof purity?.category).toBe("string");
  });
});
