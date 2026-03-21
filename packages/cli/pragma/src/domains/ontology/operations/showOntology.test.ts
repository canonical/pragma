import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PragmaError } from "../../../error/index.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import showOntology from "./showOntology.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("showOntology", () => {
  it("returns classes and properties for a prefix", async () => {
    const result = await showOntology(store, "ds");
    expect(result.prefix).toBe("ds");
    expect(result.namespace).toBe(PREFIX_MAP.ds);
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.properties.length).toBeGreaterThan(0);
  });

  it("includes class labels and superclass relationships", async () => {
    const result = await showOntology(store, "ds");
    const component = result.classes.find((c) => c.label === "Component");
    expect(component).toBeDefined();
    expect(component?.superclass).toContain("UIBlock");
  });

  it("includes property domain and range", async () => {
    const result = await showOntology(store, "ds");
    const nameProp = result.properties.find((p) => p.uri.endsWith("name"));
    expect(nameProp).toBeDefined();
    expect(nameProp?.domain).toContain("UIBlock");
    expect(nameProp?.type).toBe("datatype");
  });

  it("resolves full namespace URI", async () => {
    const result = await showOntology(store, PREFIX_MAP.ds);
    expect(result.prefix).toBe("ds");
    expect(result.classes.length).toBeGreaterThan(0);
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(showOntology(store, "unknown")).rejects.toThrow(PragmaError);

    try {
      await showOntology(store, "unknown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("returns cs ontology with standard classes", async () => {
    const result = await showOntology(store, "cs");
    expect(result.prefix).toBe("cs");
    const standard = result.classes.find((c) => c.uri.includes("CodeStandard"));
    expect(standard).toBeDefined();
  });
});
