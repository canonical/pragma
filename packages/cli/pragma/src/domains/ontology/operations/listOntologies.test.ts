import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../shared/prefixes.js";
import listOntologies from "./listOntologies.js";

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
    expect(ds?.namespace).toBe(DEFAULT_PREFIX_MAP.ds);
    expect(ds?.classCount).toBeGreaterThan(0);
    expect(ds?.relationCount).toBeGreaterThan(0);
    expect(ds?.attributeCount).toBeGreaterThan(0);
    expect(ds?.anatomyCount).toBeGreaterThan(0);
  });

  it("splits relations from attributes", async () => {
    const result = await listOntologies(store);
    const ds = result.find((o) => o.prefix === "ds");
    // ds:tier is an object property; ds:name is a datatype property.
    expect(ds?.relationCount).toBeGreaterThan(0);
    expect(ds?.attributeCount).toBeGreaterThan(0);
  });

  it("carries the owl:Ontology header and SHACL shape count", async () => {
    const result = await listOntologies(store);
    const ds = result.find((o) => o.prefix === "ds");
    expect(ds?.title).toBe("Design System Ontology");
    expect(ds?.version).toBe("0.1.0-test");
    expect(ds?.shapeCount).toBeGreaterThan(0);
  });

  it("omits header fields for namespaces without an owl:Ontology node", async () => {
    const result = await listOntologies(store);
    const cs = result.find((o) => o.prefix === "cs");
    expect(cs?.title).toBeUndefined();
    expect(cs?.version).toBeUndefined();
  });

  it("includes cs namespace", async () => {
    const result = await listOntologies(store);
    const cs = result.find((o) => o.prefix === "cs");
    expect(cs).toBeDefined();
    expect(cs?.classCount).toBeGreaterThan(0);
    expect(cs?.anatomyCount).toBe(0);
  });

  it("lists namespaces without a registered prefix", async () => {
    const scoped = await createTestStore({
      ttl: `@prefix owl: <http://www.w3.org/2002/07/owl#> .
<http://unprefixed.example.org/ontology#Widget> a owl:Class .
<http://unprefixed.example.org/ontology#partOf> a owl:ObjectProperty .`,
    });
    try {
      const result = await listOntologies(scoped.store);
      const anon = result.find(
        (o) => o.namespace === "http://unprefixed.example.org/ontology#",
      );
      expect(anon).toBeDefined();
      expect(anon?.prefix).toBe("");
      expect(anon?.classCount).toBe(1);
      expect(anon?.relationCount).toBe(1);
    } finally {
      scoped.cleanup();
    }
  });

  it("derives namespaces from short path-only URIs", async () => {
    const scoped = await createTestStore({
      ttl: `@prefix owl: <http://www.w3.org/2002/07/owl#> .
<http://a/b> a owl:Class .`,
    });
    try {
      const result = await listOntologies(scoped.store);
      expect(result.find((o) => o.namespace === "http://a/")?.classCount).toBe(
        1,
      );
    } finally {
      scoped.cleanup();
    }
  });

  it("lists a namespace that only contributes SHACL shapes", async () => {
    const scoped = await createTestStore({
      ttl: `@prefix sh: <http://www.w3.org/ns/shacl#> .
<http://shapes.example.org/ontology#OnlyShape> a sh:NodeShape .`,
    });
    try {
      const result = await listOntologies(scoped.store);
      const shapeOnly = result.find(
        (o) => o.namespace === "http://shapes.example.org/ontology#",
      );
      expect(shapeOnly).toBeDefined();
      expect(shapeOnly?.shapeCount).toBe(1);
      expect(shapeOnly?.classCount).toBe(0);
    } finally {
      scoped.cleanup();
    }
  });

  it("returns sorted by prefix", async () => {
    const result = await listOntologies(store);
    const prefixes = result.map((o) => o.prefix);
    const sorted = [...prefixes].sort();
    expect(prefixes).toEqual(sorted);
  });
});
