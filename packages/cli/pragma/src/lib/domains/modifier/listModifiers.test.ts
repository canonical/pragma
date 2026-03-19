import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { listModifiers } from "./listModifiers.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listModifiers", () => {
  it("returns all modifier families", async () => {
    const result = await listModifiers(store);
    const names = result.map((m) => m.name);
    expect(names).toContain("importance");
    expect(names).toContain("density");
  });

  it("includes values for each family", async () => {
    const result = await listModifiers(store);
    const importance = result.find((m) => m.name === "importance");
    expect(importance?.values).toContain("default");
    expect(importance?.values).toContain("primary");
    expect(importance?.values).toContain("secondary");
  });

  it("returns sorted by name", async () => {
    const result = await listModifiers(store);
    const names = result.map((m) => m.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("each modifier has the correct number of values", async () => {
    const result = await listModifiers(store);
    const importance = result.find((m) => m.name === "importance");
    const density = result.find((m) => m.name === "density");
    expect(importance?.values.length).toBe(3);
    expect(density?.values.length).toBe(2);
  });
});
