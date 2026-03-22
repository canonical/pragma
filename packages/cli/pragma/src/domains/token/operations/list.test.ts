import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import listTokens from "./list.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listTokens", () => {
  it("returns all tokens", async () => {
    const result = await listTokens(store);
    const names = result.map((t) => t.name);
    expect(names).toContain("color.primary");
    expect(names).toContain("spacing.sm");
  });

  it("returns sorted by tokenId", async () => {
    const result = await listTokens(store);
    const names = result.map((t) => t.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("filters by category", async () => {
    const result = await listTokens(store, { category: "Color" });
    const names = result.map((t) => t.name);
    expect(names).toContain("color.primary");
    expect(names).not.toContain("spacing.sm");
  });

  it("category filter is case-insensitive", async () => {
    const result = await listTokens(store, { category: "color" });
    const names = result.map((t) => t.name);
    expect(names).toContain("color.primary");
    expect(names).not.toContain("spacing.sm");
  });

  it("returns empty for non-matching category", async () => {
    const result = await listTokens(store, { category: "nonexistent" });
    expect(result).toEqual([]);
  });
});
