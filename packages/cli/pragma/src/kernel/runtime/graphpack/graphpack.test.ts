import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { executeLocal } from "@canonical/ke-graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPack } from "./build.js";
import { embeddedManifest, materializeEmbeddedPack } from "./embedded.js";
import { contentHash } from "./hash.js";
import { packIsComplete } from "./manifest.js";
import { readPack } from "./read.js";
import type { PackIndex } from "./types.js";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  SCHEMA_FILE,
  STORIES_FILE,
} from "./types.js";

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

const build = (
  inputs: { path: string; content: string }[],
  stories?: { path: string; content: string }[],
) =>
  buildPack(inputs, {
    name: "test-pack",
    version: "0.0.0",
    sourceRef: "test:inline",
    prefixes: PREFIXES,
    ...(stories === undefined ? {} : { stories }),
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
  it("builds the five artifact files and reuses a cached pack", async () => {
    const result = await build([{ path: "a.ttl", content: TTL }]);
    expect(result.reused).toBe(false);
    for (const file of [
      DATA_FILE,
      SCHEMA_FILE,
      INDEX_FILE,
      STORIES_FILE,
      MANIFEST_FILE,
    ]) {
      expect(existsSync(join(result.dir, file))).toBe(true);
    }
    // Written even when the packages ship none — an OPTIONAL artifact would put
    // the same condition in three writers, which is how a pack ends up claiming
    // stories its directory does not hold.
    expect(readFileSync(join(result.dir, STORIES_FILE), "utf-8")).toBe("[]");

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

describe("the committed embedded pack (PROTECTED)", () => {
  it("materializes exactly the files buildPack produces", async () => {
    // The artifact set is named once, in types.ts, but THREE modules must obey
    // it: buildPack writes them, packIsComplete gates on them, and
    // materializeEmbeddedPack writes them back out. A fifth artifact added to
    // only some of those yields a pack whose content hash claims more than its
    // directory holds — which the next build then reuses, silently dropping the
    // difference. Comparing the two directories catches that on the day it lands.
    const built = await build([{ path: "a.ttl", content: TTL }]);
    expect(readdirSync(materializeEmbeddedPack()).sort()).toEqual(
      readdirSync(built.dir).sort(),
    );
  });

  it("is self-consistent: complete, content-addressed, and non-empty", () => {
    // No network, so CI runs it: the committed strings really do materialize a
    // bootable pack whose parts agree with each other.
    const dir = materializeEmbeddedPack();
    const manifest = embeddedManifest();
    expect(packIsComplete(dir)).toBe(true);
    expect(basename(dir)).toBe(manifest.contentHash);
    const index = JSON.parse(
      readFileSync(join(dir, INDEX_FILE), "utf-8"),
    ) as PackIndex;
    expect(index.contentHash).toBe(manifest.contentHash);
    expect(manifest.tripleCount ?? 0).toBeGreaterThan(0);
    expect(manifest.entityCount ?? 0).toBeGreaterThan(0);
  });
});

describe("graphpack carried stories (PROTECTED)", () => {
  const STORY = {
    path: "pkg/stories/recipe.json",
    content: '{"noun":"recipe"}',
  };

  it("hashes stories as sources and round-trips them byte-for-byte", async () => {
    const inputs = [{ path: "a.ttl", content: TTL }];
    const without = await build(inputs);
    const withStory = await build(inputs, [STORY]);

    // A story-only edit is a NEW pack: the same RDF with a story attached must
    // not reuse the pack built without it.
    expect(withStory.contentHash).not.toBe(without.contentHash);
    expect(
      JSON.parse(readFileSync(join(withStory.dir, STORIES_FILE), "utf-8")),
    ).toEqual([{ source: STORY.path, content: STORY.content }]);

    // …and rebuilding with the same story is a pure cache hit.
    expect((await build(inputs, [STORY])).reused).toBe(true);
  });

  it("a pack directory missing stories.json is incomplete", async () => {
    // The migration path: a pack built by the previous kernel has four files,
    // so it is refused (→ `pragma sources update`) rather than reused as if it
    // carried the stories its hash covers.
    const { dir } = await build([{ path: "a.ttl", content: TTL }]);
    expect(packIsComplete(dir)).toBe(true);
    rmSync(join(dir, STORIES_FILE));
    expect(packIsComplete(dir)).toBe(false);
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

  it("tolerates a benign superset (actual > recorded), not corruption", async () => {
    // A future ke counting change could load MORE triples than the manifest
    // recorded. That is not truncation, so boot must NOT reject it — otherwise
    // one counting change trips a fleet-wide false STORE_UNAVAILABLE. Simulate by
    // lowering the manifest's tripleCount below the dump's actual count.
    const uniqueTtl = `${TTL}\nex:Superset a ex:Component ; rdfs:label "Superset" .\n`;
    const { dir } = await build([{ path: "superset.ttl", content: uniqueTtl }]);
    const manifestPath = join(dir, MANIFEST_FILE);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      tripleCount: number;
    };
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, tripleCount: manifest.tripleCount - 1 }),
    );

    // The booted store holds one MORE triple than the (lowered) manifest — a
    // superset. On the pre-fix exact-equality guard this threw; now it boots.
    const session = await readPack(dir);
    expect(session.index.entities.length).toBeGreaterThan(0);
    session.store.dispose();
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
