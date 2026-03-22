import type { Store } from "@canonical/ke";
import type { TestStoreResult } from "@canonical/ke/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ONTOLOGY_TTL, DS_TIERS_TTL } from "#testing";
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
  });

  it("returns the global tier", async () => {
    const entry = await validateTier(store, "global");
    expect(entry.path).toBe("global");
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
        recovery: { message: string; cli: string };
      };
      expect(pragmaErr.code).toBe("INVALID_INPUT");
      expect(pragmaErr.validOptions).toContain("global");
      expect(pragmaErr.validOptions).toContain("apps");
      expect(pragmaErr.validOptions).toContain("apps/lxd");
      expect(pragmaErr.recovery.cli).toBe("pragma config tier --reset");
    }
  });
});
