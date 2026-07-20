import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  cacheHome = mkdtempSync(join(tmpdir(), "pragma-graphpack-"));
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

describe("graphpack manifest — persisted counts (A9/A10)", () => {
  it("records tripleCount and a distinct-abox entityCount", async () => {
    const { dir } = await build([{ path: "a.ttl", content: TTL }]);
    const manifest = JSON.parse(
      readFileSync(join(dir, MANIFEST_FILE), "utf-8"),
    ) as { tripleCount?: number; entityCount?: number };
    expect(typeof manifest.tripleCount).toBe("number");
    expect(manifest.tripleCount ?? 0).toBeGreaterThan(0);
    // TTL declares two individuals (ex:Button, ex:Card) → two abox subjects.
    expect(manifest.entityCount).toBe(2);
  });
});

describe("graphpack read — truncated data cache (A9)", () => {
  it("a truncated-but-non-empty data.nq surfaces STORE_UNAVAILABLE", async () => {
    // A UNIQUE graph so corrupting its cache never poisons the shared TTL pack.
    const uniqueTtl = `${TTL}\nex:Truncated a ex:Component ; rdfs:label "Truncated" .\n`;
    const { dir } = await build([{ path: "trunc.ttl", content: uniqueTtl }]);
    const dataPath = join(dir, DATA_FILE);
    const lines = readFileSync(dataPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "");
    expect(lines.length).toBeGreaterThan(1);
    // Drop the last statement: the dump is now a PARTIAL graph — still
    // non-empty (so it passes the size>0 completeness gate) but fewer triples
    // than the manifest recorded, which the boot cross-check must catch.
    writeFileSync(dataPath, `${lines.slice(0, -1).join("\n")}\n`);

    let caught: unknown;
    try {
      const session = await readPack(dir);
      session.store.dispose();
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "STORE_UNAVAILABLE" });
  });
});

describe("graphpack read — incomplete pack recovery (CLI + MCP)", () => {
  it("an incomplete pack is STORE_UNAVAILABLE with a `sources_update` tool recovery", async () => {
    // A dir with no manifest is an incomplete pack — readPack rejects before any
    // store boot. The recovery names both the CLI command and the MCP tool an
    // agent calls, so a cold agent isn't left with a CLI-only hint it can't run.
    const emptyDir = mkdtempSync(join(tmpdir(), "pragma-incomplete-pack-"));
    try {
      let caught: unknown;
      try {
        await readPack(emptyDir);
      } catch (error) {
        caught = error;
      }
      expect(caught).toMatchObject({ code: "STORE_UNAVAILABLE" });
      const recovery = (caught as { recovery?: Record<string, unknown> })
        .recovery;
      expect(recovery?.cli).toBe("pragma sources update");
      expect(recovery?.mcp).toMatchObject({ tool: "sources_update" });
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
