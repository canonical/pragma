import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeLocal } from "@canonical/ke-graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPack } from "./build.js";
import { contentHash } from "./hash.js";
import { readPack } from "./read.js";
import { DATA_FILE, INDEX_FILE, MANIFEST_FILE, SCHEMA_FILE } from "./types.js";

const PREFIXES = {
  ex: "https://pragma.canonical.com/sample#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix ex:   <https://pragma.canonical.com/sample#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
ex:Component a owl:Class ; rdfs:label "Component" .
ex:componentName a owl:DatatypeProperty ; rdfs:domain ex:Component ; rdfs:range xsd:string .
ex:Button a ex:Component ; rdfs:label "Button" ; ex:componentName "Button" .
ex:Card a ex:Component ; rdfs:label "Card" ; ex:componentName "Card" .
`;

const build = (inputs: { path: string; content: string }[]) =>
  buildPack(inputs, {
    name: "test-pack",
    version: "0.0.0",
    sourceRef: "test:inline",
    prefixes: PREFIXES,
  });

let savedCacheHome: string | undefined;
let cacheHome: string;

beforeAll(() => {
  savedCacheHome = process.env.XDG_CACHE_HOME;
  cacheHome = mkdtempSync(join(tmpdir(), "pragma2-graphpack-"));
  process.env.XDG_CACHE_HOME = cacheHome;
});

afterAll(() => {
  process.env.XDG_CACHE_HOME = savedCacheHome;
  rmSync(cacheHome, { recursive: true, force: true });
});

describe("graphpack round-trip (PROTECTED)", () => {
  it("builds the four artifact files and reuses a cached pack", async () => {
    const result = await build([{ path: "a.ttl", content: TTL }]);
    expect(result.reused).toBe(false);
    for (const file of [DATA_FILE, SCHEMA_FILE, INDEX_FILE, MANIFEST_FILE]) {
      expect(existsSync(join(result.dir, file))).toBe(true);
    }

    // A second build over identical inputs is a pure cache hit — no rebuild.
    const again = await build([{ path: "a.ttl", content: TTL }]);
    expect(again.reused).toBe(true);
    expect(again.contentHash).toBe(result.contentHash);
  });

  it("boots the pack: SPARQL data + an executable schema + the entity index", async () => {
    const { dir } = await build([{ path: "a.ttl", content: TTL }]);
    const session = await readPack(dir);
    try {
      const count = await session.store.query(
        "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }" as never,
      );
      expect(count.type).toBe("select");
      expect(
        Number((count as { bindings: { n: string }[] }).bindings[0]?.n),
      ).toBeGreaterThan(0);

      // compileFromExtraction produced a working schema.
      expect(session.schema.getType("Component")).toBeDefined();

      // A GraphQL query resolves ABox data through the booted store.
      const gql = await executeLocal({
        schema: session.schema,
        source: "{ __schema { queryType { name } } }",
        contextValue: session.createContext(session.store),
      });
      expect((gql as { errors?: unknown[] }).errors).toBeUndefined();

      // The index carries the FROZEN { name, type } minimum.
      const names = session.index.entities.map((e) => e.name);
      expect(names).toContain("ex:Button");
      expect(names).toContain("ex:Component");
      const button = session.index.entities.find((e) => e.name === "ex:Button");
      expect(button?.type).toBe("ex:Component");
      expect(button?.box).toBe("abox");
      const component = session.index.entities.find(
        (e) => e.name === "ex:Component",
      );
      expect(component?.type).toBe("owl:Class");
      expect(component?.box).toBe("tbox");
    } finally {
      session.store.dispose();
    }
  });
});

describe("graphpack hash stability (PROTECTED)", () => {
  it("is order-independent and content-sensitive", async () => {
    const a = { path: "a.ttl", content: "ex:one a ex:X ." };
    const b = { path: "b.ttl", content: "ex:two a ex:Y ." };
    const forward = await contentHash([a, b]);
    const reversed = await contentHash([b, a]);
    expect(forward).toBe(reversed);

    const changed = await contentHash([
      { ...a, content: "ex:one a ex:Z ." },
      b,
    ]);
    expect(changed).not.toBe(forward);
  });

  it("the built manifest's contentHash names its cache directory", async () => {
    const result = await build([{ path: "a.ttl", content: TTL }]);
    const manifest = JSON.parse(
      readFileSync(join(result.dir, MANIFEST_FILE), "utf-8"),
    );
    expect(manifest.contentHash).toBe(result.contentHash);
    expect(result.dir.endsWith(result.contentHash)).toBe(true);
  });
});
