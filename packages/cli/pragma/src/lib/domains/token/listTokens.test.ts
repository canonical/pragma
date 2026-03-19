import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { listTokens } from "./listTokens.js";

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

  it("each token has a category", async () => {
    const result = await listTokens(store);
    for (const token of result) {
      expect(typeof token.category).toBe("string");
    }
  });
});
