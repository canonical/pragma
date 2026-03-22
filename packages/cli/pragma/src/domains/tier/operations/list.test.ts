import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import listTiers from "./list.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listTiers", () => {
  it("returns all tiers from the ontology", async () => {
    const result = await listTiers(store);
    const paths = result.map((t) => t.path);
    expect(paths).toContain("global");
    expect(paths).toContain("apps");
    expect(paths).toContain("apps/lxd");
  });

  it("returns sorted by name", async () => {
    const result = await listTiers(store);
    const paths = result.map((t) => t.path);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
