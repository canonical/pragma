import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import { P, PREFIX_MAP } from "../../shared/prefixes.js";
import inspectUri from "./inspectUri.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("inspectUri", () => {
  it("returns grouped triples for a known URI", async () => {
    const result = await inspectUri(store, `${P.ds}global.component.button`);
    expect(result.uri).toBe(`${PREFIX_MAP.ds}global.component.button`);
    expect(result.groups.length).toBeGreaterThan(0);

    const predicates = result.groups.map((g) => g.predicate);
    expect(predicates).toContain(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    );
  });

  it("resolves prefixed URIs", async () => {
    const result = await inspectUri(store, `${P.ds}global.component.button`);
    expect(result.uri).toBe(`${PREFIX_MAP.ds}global.component.button`);
  });

  it("accepts full URIs", async () => {
    const result = await inspectUri(
      store,
      `${PREFIX_MAP.ds}global.component.button`,
    );
    expect(result.uri).toBe(`${PREFIX_MAP.ds}global.component.button`);
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it("groups objects by predicate", async () => {
    const result = await inspectUri(store, `${P.ds}global.component.button`);
    const modifierGroup = result.groups.find((g) =>
      g.predicate.includes("modifier"),
    );
    // Button has two modifiers (importance, density)
    if (modifierGroup) {
      expect(modifierGroup.objects.length).toBe(2);
    }
  });

  it("throws PragmaError.notFound for unknown URI", async () => {
    await expect(
      inspectUri(store, `${P.ds}nonexistent_entity`),
    ).rejects.toThrow(PragmaError);

    try {
      await inspectUri(store, `${P.ds}nonexistent_entity`);
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(inspectUri(store, "unknown:something")).rejects.toThrow(
      PragmaError,
    );

    try {
      await inspectUri(store, "unknown:something");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("throws PragmaError.invalidInput for bare string without prefix", async () => {
    await expect(inspectUri(store, "button")).rejects.toThrow(PragmaError);

    try {
      await inspectUri(store, "button");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("throws PragmaError.invalidInput for URI with unsafe IRI characters", async () => {
    await expect(
      inspectUri(store, "https://example.com/<injected>"),
    ).rejects.toThrow(PragmaError);

    try {
      await inspectUri(store, "https://example.com/<injected>");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
