import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import getStandard from "./get.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

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
