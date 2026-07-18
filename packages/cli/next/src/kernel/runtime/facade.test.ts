import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

// Spy on the compiler entry points while keeping the real implementations, so
// we can assert that BOOT rebuilds the schema from the extraction artifact
// (compileFromExtraction) and NEVER runs the live 7-pass compile.
vi.mock("@canonical/ke-graphql", async (importActual) => {
  const actual = await importActual<typeof import("@canonical/ke-graphql")>();
  return {
    ...actual,
    compile: vi.fn(actual.compile),
    compileFromExtraction: vi.fn(actual.compileFromExtraction),
  };
});

import { compile, compileFromExtraction } from "@canonical/ke-graphql";
import { createQueryFacade } from "./facade.js";
import { buildPack } from "./graphpack/build.js";
import { readPack } from "./graphpack/read.js";
import type { LazyStore } from "./types.js";

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
ex:Button a ex:Component ; rdfs:label "Button" .
`;

let savedCacheHome: string | undefined;
let cacheHome: string;
let dir: string;

beforeAll(async () => {
  savedCacheHome = process.env.XDG_CACHE_HOME;
  cacheHome = mkdtempSync(join(tmpdir(), "pragma2-facade-"));
  process.env.XDG_CACHE_HOME = cacheHome;
  // Building the pack is the ONE place the live compile runs.
  const built = await buildPack([{ path: "a.ttl", content: TTL }], {
    name: "facade-test",
    version: "0.0.0",
    sourceRef: "test:inline",
    prefixes: PREFIXES,
  });
  dir = built.dir;
  expect((compile as unknown as Mock).mock.calls.length).toBeGreaterThan(0);
});

afterAll(() => {
  process.env.XDG_CACHE_HOME = savedCacheHome;
  rmSync(cacheHome, { recursive: true, force: true });
});

describe("query facade round-trip (PROTECTED)", () => {
  it("boots via compileFromExtraction and never calls the live compile", async () => {
    (compile as unknown as Mock).mockClear();
    (compileFromExtraction as unknown as Mock).mockClear();

    // A minimal lazy store pointed straight at the built pack.
    let booted = false;
    const store: LazyStore = {
      get booted() {
        return booted;
      },
      async get() {
        const session = await readPack(dir);
        booted = true;
        return session;
      },
    };
    const facade = createQueryFacade(store);

    const result = await facade.graphql("{ __schema { queryType { name } } }");
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();

    // Boot rebuilt the schema from the artifact — the live compile stayed cold.
    expect((compileFromExtraction as unknown as Mock).mock.calls.length).toBe(
      1,
    );
    expect((compile as unknown as Mock).mock.calls.length).toBe(0);
  });

  it("sparql escape hatch queries the store", async () => {
    let booted = false;
    const store: LazyStore = {
      get booted() {
        return booted;
      },
      async get() {
        const session = await readPack(dir);
        booted = true;
        return session;
      },
    };
    const facade = createQueryFacade(store);
    const result = await facade.sparql(
      "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }",
    );
    expect(result.type).toBe("select");
  });
});
