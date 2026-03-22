import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import getModifier from "./get.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("getModifier", () => {
  it("returns a single modifier family with values", async () => {
    const result = await getModifier(store, "density");
    expect(result.name).toBe("density");
    expect(result.values).toContain("default");
    expect(result.values).toContain("compact");
  });

  it("throws PragmaError.notFound for unknown modifier", async () => {
    await expect(getModifier(store, "nonexistent")).rejects.toThrow(
      PragmaError,
    );

    try {
      await getModifier(store, "nonexistent");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });
});
