import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { listTiers } from "./listTiers.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listTiers", () => {
  it("returns all tiers from the ontology", async () => {
    const result = await listTiers(store);
    const paths = result.map((t) => t.path);
    expect(paths).toContain("global");
    expect(paths).toContain("apps");
    expect(paths).toContain("apps/lxd");
  });

  it("includes parent references", async () => {
    const result = await listTiers(store);
    const appsLxd = result.find((t) => t.path === "apps/lxd");
    expect(appsLxd?.parent).toBe("apps");
    expect(appsLxd?.depth).toBe(2);
  });

  it("global has no parent", async () => {
    const result = await listTiers(store);
    const global = result.find((t) => t.path === "global");
    expect(global?.parent).toBeUndefined();
    expect(global?.depth).toBe(0);
  });

  it("returns sorted by depth then path", async () => {
    const result = await listTiers(store);
    expect(result[0].path).toBe("global");
    expect(result[1].path).toBe("apps");
    expect(result[2].path).toBe("apps/lxd");
  });

  it("returns exactly 3 tiers", async () => {
    const result = await listTiers(store);
    expect(result.length).toBe(3);
  });

  it("apps has parent global", async () => {
    const result = await listTiers(store);
    const apps = result.find((t) => t.path === "apps");
    expect(apps?.parent).toBe("global");
  });
});
