import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PragmaError } from "../../../error/index.js";
import { getToken } from "./getToken.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("getToken", () => {
  it("returns detailed data with theme values", async () => {
    const result = await getToken(store, "color.primary");
    expect(result.name).toBe("color.primary");
    expect(result.values.length).toBe(2);

    const light = result.values.find((v) => v.theme === "light");
    expect(light?.value).toBe("#0066cc");

    const dark = result.values.find((v) => v.theme === "dark");
    expect(dark?.value).toBe("#4d9aff");
  });

  it("throws PragmaError.notFound for unknown token", async () => {
    await expect(getToken(store, "nonexistent")).rejects.toThrow(PragmaError);

    try {
      await getToken(store, "nonexistent");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("token with both light and dark values has 2 entries", async () => {
    const result = await getToken(store, "color.primary");
    expect(result.values.length).toBe(2);
    const themes = result.values.map((v) => v.theme);
    expect(themes).toContain("light");
    expect(themes).toContain("dark");
  });

  it("returns exact values matching fixture", async () => {
    const result = await getToken(store, "color.primary");
    const light = result.values.find((v) => v.theme === "light");
    const dark = result.values.find((v) => v.theme === "dark");
    expect(light?.value).toBe("#0066cc");
    expect(dark?.value).toBe("#4d9aff");
  });
});
