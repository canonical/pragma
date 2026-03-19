import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import { getStandard, listCategories, listStandards } from "./operations.js";

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
});

describe("getStandard", () => {
  it("returns detailed data with dos and donts", async () => {
    const result = await getStandard(store, "react/component/folder-structure");
    expect(result.name).toBe("react/component/folder-structure");
    expect(result.category).toBe("react");
    expect(result.dos.length).toBeGreaterThan(0);
    expect(result.donts.length).toBeGreaterThan(0);
  });

  it("throws PragmaError.notFound for unknown standard", async () => {
    await expect(getStandard(store, "nonexistent")).rejects.toThrow(
      PragmaError,
    );

    try {
      await getStandard(store, "nonexistent");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });
});

describe("listCategories", () => {
  it("returns distinct categories", async () => {
    const result = await listCategories(store);
    expect(result).toContain("react");
    expect(result).toContain("code");
    expect(result.length).toBe(2);
  });
});
