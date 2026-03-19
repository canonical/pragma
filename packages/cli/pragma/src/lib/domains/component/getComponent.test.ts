import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PragmaError } from "../../../error/index.js";
import type { FilterConfig } from "../shared/types.js";
import { getComponent } from "./getComponent.js";

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

  it("returns empty modifierValues for a component with no modifiers", async () => {
    const result = await getComponent(store, "Card", noFilter);
    expect(result.modifierValues).toEqual([]);
  });

  it("includes implementationPaths for Card", async () => {
    const result = await getComponent(store, "Card", noFilter);
    // Card has at least one implementation in the fixture
    expect(result.implementationPaths.length).toBeGreaterThan(0);
  });

  it("returns empty tokens for a component with no tokens", async () => {
    const result = await getComponent(store, "Card", noFilter);
    expect(result.tokens).toEqual([]);
  });
});
