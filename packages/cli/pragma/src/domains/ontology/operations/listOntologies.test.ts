import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import listOntologies from "./listOntologies.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listOntologies", () => {
  it("returns loaded namespaces with counts", async () => {
    const result = await listOntologies(store);
    expect(result.length).toBeGreaterThan(0);

    const ds = result.find((o) => o.prefix === "ds");
    expect(ds).toBeDefined();
    expect(ds?.namespace).toBe(PREFIX_MAP.ds);
    expect(ds?.classCount).toBeGreaterThan(0);
    expect(ds?.propertyCount).toBeGreaterThan(0);
  });

  it("includes cs namespace", async () => {
    const result = await listOntologies(store);
    const cs = result.find((o) => o.prefix === "cs");
    expect(cs).toBeDefined();
    expect(cs?.classCount).toBeGreaterThan(0);
  });

  it("returns sorted by prefix", async () => {
    const result = await listOntologies(store);
    const prefixes = result.map((o) => o.prefix);
    const sorted = [...prefixes].sort();
    expect(prefixes).toEqual(sorted);
  });
});
