import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import lookupToken from "./lookup.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("lookupToken", () => {
  it("returns detailed data with theme values", async () => {
    const result = await lookupToken(store, "color.primary");
    expect(result.name).toBe("color.primary");
    expect(result.values.length).toBe(2);

    const light = result.values.find((v) => v.theme === "light");
    expect(light?.value).toBe("#0066cc");

    const dark = result.values.find((v) => v.theme === "dark");
    expect(dark?.value).toBe("#4d9aff");
  });

  it("throws PragmaError.notFound for unknown token", async () => {
    await expect(lookupToken(store, "nonexistent")).rejects.toThrow(
      PragmaError,
    );

    try {
      await lookupToken(store, "nonexistent");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });
});
