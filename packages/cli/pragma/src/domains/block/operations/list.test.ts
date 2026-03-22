import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { FilterConfig } from "../../shared/types.js";
import listBlocks from "./list.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

const noFilter: FilterConfig = { tier: undefined, channel: "prerelease" };
const normalChannel: FilterConfig = { tier: undefined, channel: "normal" };
const globalTier: FilterConfig = { tier: "global", channel: "prerelease" };
const lxdTier: FilterConfig = { tier: "apps/lxd", channel: "normal" };

describe("listBlocks", () => {
  it("returns all blocks with no tier filter and prerelease channel", async () => {
    const result = await listBlocks(store, noFilter);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).toContain("Beta Widget");
  });

  it("excludes beta blocks with normal channel", async () => {
    const result = await listBlocks(store, normalChannel);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).not.toContain("Beta Widget");
  });

  it("filters by tier (global only)", async () => {
    const result = await listBlocks(store, globalTier);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("Beta Widget");
    expect(names).not.toContain("LXD Panel");
  });

  it("applies orthogonal tier + channel filters", async () => {
    const result = await listBlocks(store, lxdTier);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).not.toContain("Beta Widget");
  });

  it("returns sorted by name", async () => {
    const result = await listBlocks(store, noFilter);
    const names = result.map((c) => c.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("includes modifier names on Button", async () => {
    const result = await listBlocks(store, noFilter);
    const button = result.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    expect(button?.modifiers).toContain("importance");
    expect(button?.modifiers).toContain("density");
  });

  it("counts tokens on Button", async () => {
    const result = await listBlocks(store, noFilter);
    const button = result.find((c) => c.name === "Button");
    expect(button?.tokenCount).toBe(1);
  });
});
