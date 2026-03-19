import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { listCategories } from "./listCategories.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listCategories", () => {
  it("returns distinct categories with counts", async () => {
    const result = await listCategories(store);
    const names = result.map((c) => c.name);
    expect(names).toContain("react");
    expect(names).toContain("code");
    expect(result.length).toBe(2);
  });

  it("includes standard counts per category", async () => {
    const result = await listCategories(store);
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
});
