import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import lookupModifier from "./lookup.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("lookupModifier", () => {
  it("returns a single modifier family with values", async () => {
    const result = await lookupModifier(store, "density");
    expect(result.name).toBe("density");
    expect(result.values).toContain("default");
    expect(result.values).toContain("compact");
  });

  it("throws PragmaError.notFound for unknown modifier", async () => {
    await expect(lookupModifier(store, "nonexistent")).rejects.toThrow(
      PragmaError,
    );

    try {
      await lookupModifier(store, "nonexistent");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });
});
