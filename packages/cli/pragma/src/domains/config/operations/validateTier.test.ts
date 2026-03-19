import type { Store } from "@canonical/ke";
import type { TestStoreResult } from "@canonical/ke/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DS_ONTOLOGY_TTL,
  DS_TIERS_TTL,
} from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import validateTier from "./validateTier.js";

const TIERS_TTL = [DS_ONTOLOGY_TTL, DS_TIERS_TTL].join("\n");

describe("validateTier", () => {
  let store: Store;
  let cleanup: TestStoreResult["cleanup"];

  beforeAll(async () => {
    const result = await createTestStore({ ttl: TIERS_TTL });
    store = result.store;
    cleanup = result.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("returns the matching TierEntry for a valid tier", async () => {
    const entry = await validateTier(store, "apps/lxd");
    expect(entry.path).toBe("apps/lxd");
    expect(entry.depth).toBe(2);
  });

  it("returns the global tier", async () => {
    const entry = await validateTier(store, "global");
    expect(entry.path).toBe("global");
    expect(entry.depth).toBe(0);
  });

  it("throws INVALID_INPUT for a nonexistent tier", async () => {
    await expect(validateTier(store, "apps/nonexistent")).rejects.toThrow(
      'Invalid tier "apps/nonexistent"',
    );
  });

  it("includes valid tier paths in error validOptions", async () => {
    try {
      await validateTier(store, "nope");
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      const pragmaErr = err as {
        code: string;
        validOptions: string[];
        recovery: string;
      };
      expect(pragmaErr.code).toBe("INVALID_INPUT");
      expect(pragmaErr.validOptions).toContain("global");
      expect(pragmaErr.validOptions).toContain("apps");
      expect(pragmaErr.validOptions).toContain("apps/lxd");
      expect(pragmaErr.recovery).toBe("pragma config tier --reset");
    }
  });
});
