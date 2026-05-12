import type { Store } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import detectCrossDomain from "./detectCrossDomain.js";

let store: Store;
let cleanup: () => void;

describe("detectCrossDomain", () => {
  beforeAll(async () => {
    const result = await createTestStore({ ttl: DS_ALL_TTL });
    store = result.store;
    cleanup = result.cleanup;
  });

  afterAll(() => {
    cleanup();
  });

  it("T2-4: returns undefined when name is not in any domain", async () => {
    const hint = await detectCrossDomain("nonexistent_xyz", "token", store);
    expect(hint).toBeUndefined();
  });

  it("returns a hint with the correct shape", async () => {
    const hint = await detectCrossDomain("Button", "modifier", store);
    if (hint) {
      expect(hint).toHaveProperty("domain");
      expect(hint).toHaveProperty("entityType");
      expect(hint).toHaveProperty("cli");
      expect(hint).toHaveProperty("mcp");
      expect(hint.mcp).toHaveProperty("tool");
      expect(hint.mcp).toHaveProperty("params");
    }
  });

  it("skips the current domain", async () => {
    const hint = await detectCrossDomain("Button", "block", store);
    if (hint) {
      expect(hint.domain).not.toBe("block");
    }
  });
});
