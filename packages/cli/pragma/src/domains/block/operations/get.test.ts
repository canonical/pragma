import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { FilterConfig } from "../../shared/types.js";
import getBlock from "./get.js";

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

describe("getBlock", () => {
  it("returns detailed data for Button", async () => {
    const result = await getBlock(store, "Button", noFilter);
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
    const result = await getBlock(store, "Button", noFilter);
    const react = result.implementationPaths.find(
      (i) => i.framework === "react",
    );
    expect(react).toBeDefined();
    expect(react?.path).toContain("Button.tsx");
  });

  it("includes token references", async () => {
    const result = await getBlock(store, "Button", noFilter);
    expect(result.tokens.length).toBe(1);
    expect(result.tokens[0].name).toBe("color.primary");
  });

  it("populates nodeCount from anatomy nodes", async () => {
    const result = await getBlock(store, "Button", noFilter);
    expect(result.nodeCount).toBe(3);
  });

  it("throws PragmaError.notFound for unknown block", async () => {
    await expect(getBlock(store, "NonExistent", noFilter)).rejects.toThrow(
      PragmaError,
    );

    try {
      await getBlock(store, "NonExistent", noFilter);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("respects channel filter", async () => {
    await expect(getBlock(store, "Beta Widget", normalChannel)).rejects.toThrow(
      PragmaError,
    );
  });
});
