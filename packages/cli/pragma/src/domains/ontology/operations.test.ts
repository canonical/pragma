import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import {
  listOntologies,
  showOntology,
  showOntologyRaw,
} from "./operations.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("listOntologies", () => {
  it("returns loaded namespaces with counts", async () => {
    const result = await listOntologies(store);
    expect(result.length).toBeGreaterThan(0);

    const ds = result.find((o) => o.prefix === "ds");
    expect(ds).toBeDefined();
    expect(ds!.namespace).toBe("https://ds.canonical.com/");
    expect(ds!.classCount).toBeGreaterThan(0);
    expect(ds!.propertyCount).toBeGreaterThan(0);
  });

  it("includes cso namespace", async () => {
    const result = await listOntologies(store);
    const cso = result.find((o) => o.prefix === "cso");
    expect(cso).toBeDefined();
    expect(cso!.classCount).toBeGreaterThan(0);
  });

  it("returns sorted by prefix", async () => {
    const result = await listOntologies(store);
    const prefixes = result.map((o) => o.prefix);
    const sorted = [...prefixes].sort();
    expect(prefixes).toEqual(sorted);
  });
});

describe("showOntology", () => {
  it("returns classes and properties for a prefix", async () => {
    const result = await showOntology(store, "ds");
    expect(result.prefix).toBe("ds");
    expect(result.namespace).toBe("https://ds.canonical.com/");
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.properties.length).toBeGreaterThan(0);
  });

  it("includes class labels and superclass relationships", async () => {
    const result = await showOntology(store, "ds");
    const component = result.classes.find((c) => c.label === "Component");
    expect(component).toBeDefined();
    expect(component!.superclass).toContain("UIBlock");
  });

  it("includes property domain and range", async () => {
    const result = await showOntology(store, "ds");
    const nameProp = result.properties.find((p) =>
      p.uri.endsWith("name"),
    );
    expect(nameProp).toBeDefined();
    expect(nameProp!.domain).toContain("UIBlock");
    expect(nameProp!.type).toBe("datatype");
  });

  it("resolves full namespace URI", async () => {
    const result = await showOntology(
      store,
      "https://ds.canonical.com/",
    );
    expect(result.prefix).toBe("ds");
    expect(result.classes.length).toBeGreaterThan(0);
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(showOntology(store, "unknown")).rejects.toThrow(
      PragmaError,
    );

    try {
      await showOntology(store, "unknown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("returns cso ontology with standard classes", async () => {
    const result = await showOntology(store, "cso");
    expect(result.prefix).toBe("cso");
    const standard = result.classes.find((c) =>
      c.uri.includes("CodeStandard"),
    );
    expect(standard).toBeDefined();
  });
});

describe("showOntologyRaw", () => {
  it("returns triples for a known namespace", async () => {
    const triples = await showOntologyRaw(store, "ds");
    expect(triples.length).toBeGreaterThan(0);

    const subjects = triples.map((t) => t.subject);
    expect(subjects.some((s) => s.startsWith("https://ds.canonical.com/"))).toBe(
      true,
    );
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(showOntologyRaw(store, "unknown")).rejects.toThrow(
      PragmaError,
    );

    try {
      await showOntologyRaw(store, "unknown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
