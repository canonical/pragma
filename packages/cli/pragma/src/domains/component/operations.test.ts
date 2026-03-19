import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import type { FilterConfig } from "../shared/types.js";
import { getComponent, listComponents } from "./operations.js";

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

describe("listComponents", () => {
  it("returns all components with no tier filter and prerelease channel", async () => {
    const result = await listComponents(store, noFilter);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).toContain("Beta Widget");
  });

  it("excludes beta components with normal channel", async () => {
    const result = await listComponents(store, normalChannel);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).not.toContain("Beta Widget");
  });

  it("filters by tier (global only)", async () => {
    const result = await listComponents(store, globalTier);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("Beta Widget");
    expect(names).not.toContain("LXD Panel");
  });

  it("applies orthogonal tier + channel filters", async () => {
    const result = await listComponents(store, lxdTier);
    const names = result.map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
    expect(names).toContain("LXD Panel");
    expect(names).not.toContain("Beta Widget");
  });

  it("returns sorted by name", async () => {
    const result = await listComponents(store, noFilter);
    const names = result.map((c) => c.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("includes modifier names on Button", async () => {
    const result = await listComponents(store, noFilter);
    const button = result.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    expect(button?.modifiers).toContain("importance");
    expect(button?.modifiers).toContain("density");
  });

  it("counts tokens on Button", async () => {
    const result = await listComponents(store, noFilter);
    const button = result.find((c) => c.name === "Button");
    expect(button?.tokenCount).toBe(1);
  });
});

describe("getComponent", () => {
  it("returns detailed data for Button", async () => {
    const result = await getComponent(store, "Button", noFilter);
    expect(result.name).toBe("Button");
    expect(result.tier).toBe("global");
    expect(result.modifierValues.length).toBeGreaterThan(0);

    const importance = result.modifierValues.find(
      (m) => m.family === "importance",
    );
    expect(importance?.values).toContain("primary");
    expect(importance?.values).toContain("secondary");
  });

  it("includes implementation paths", async () => {
    const result = await getComponent(store, "Button", noFilter);
    const react = result.implementationPaths.find(
      (i) => i.framework === "react",
    );
    expect(react).toBeDefined();
    expect(react?.path).toContain("Button.tsx");
  });

  it("includes token references", async () => {
    const result = await getComponent(store, "Button", noFilter);
    expect(result.tokens.length).toBe(1);
    expect(result.tokens[0].name).toBe("color.primary");
  });

  it("throws PragmaError.notFound for unknown component", async () => {
    await expect(getComponent(store, "NonExistent", noFilter)).rejects.toThrow(
      PragmaError,
    );

    try {
      await getComponent(store, "NonExistent", noFilter);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("respects channel filter", async () => {
    await expect(
      getComponent(store, "Beta Widget", normalChannel),
    ).rejects.toThrow(PragmaError);
  });
});
