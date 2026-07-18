/**
 * The seam contract between PR2's pack index and PR-C's completion reader.
 *
 * Proves the two halves agree end-to-end: build a REAL pack with the live index
 * builder (`buildPack` → `buildIndex`) over a TTL fixture, write the project
 * lock that points at it, then resolve entity completions through
 * `createIndexEntityReader` (the storeless reader) and the full `runComplete`
 * pipeline (the wired `indexCompletionEnv`). If PR2's on-disk `PackIndex` shape
 * and PR-C's reader ever diverged, this test would break — the frozen
 * `{ name, type }` minimum is the contract.
 *
 * Booting a store here is fine: this is the graphpack suite. The COMPLETION
 * fast path never does (see kernel/completion/safety.test.ts).
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runComplete } from "../../completion/complete.js";
import {
  createIndexEntityReader,
  indexCompletionEnv,
} from "../../completion/entitySource.js";
import type { CapabilityModule, VerbSpec } from "../../spec/types.js";
import { buildPack } from "./build.js";

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
ex:Card a ex:Component ; rdfs:label "Card" .
`;

/** `block lookup <name>` — an entity positional filtered to `ex:Component`. */
const lookupModule: CapabilityModule = {
  name: "seam-fixture",
  verbs: [
    {
      path: ["block", "lookup"],
      summary: "Look up a block.",
      params: [
        {
          kind: "string",
          name: "name",
          doc: "The block name.",
          positional: true,
          required: true,
          complete: { kind: "entity", type: "ex:Component" },
        },
      ],
      output: {
        formatters: {
          plain: String,
          llm: String,
          json: (value) => JSON.stringify(value),
        },
      },
      capability: {
        needsStore: true,
        mutates: false,
        mcp: { expose: false, reason: "test" },
      },
      run: async () => ({}),
    } as VerbSpec,
  ],
};

let savedCacheHome: string | undefined;
let cacheHome: string;
let cwd: string;

beforeAll(async () => {
  savedCacheHome = process.env.XDG_CACHE_HOME;
  cacheHome = mkdtempSync(join(tmpdir(), "pragma2-seam-cache-"));
  process.env.XDG_CACHE_HOME = cacheHome;

  // Build a real pack (data.nq + schema.json + index.json + manifest.json).
  const result = await buildPack([{ path: "a.ttl", content: TTL }], {
    name: "seam-pack",
    version: "0.0.0",
    sourceRef: "test:inline",
    prefixes: PREFIXES,
  });

  // The committed project lock the reader resolves the active pack from.
  cwd = mkdtempSync(join(tmpdir(), "pragma2-seam-cwd-"));
  writeFileSync(
    join(cwd, "pragma.lock.json"),
    JSON.stringify({ contentHash: result.contentHash }),
  );
});

afterAll(() => {
  process.env.XDG_CACHE_HOME = savedCacheHome;
  rmSync(cacheHome, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

describe("completion seam contract (PROTECTED)", () => {
  it("the reader parses the live-built PackIndex by the frozen { name, type }", () => {
    const read = createIndexEntityReader(cwd);
    // Abox individuals of ex:Component, sorted — straight from the built index.
    expect(read("ex:Component", "")).toEqual(["ex:Button", "ex:Card"]);
    // The tbox class filters on its meta-type, not the domain class.
    expect(read("owl:Class", "")).toEqual(["ex:Component"]);
    // Prefix filter passes through.
    expect(read("ex:Component", "ex:B")).toEqual(["ex:Button"]);
  });

  it("runComplete resolves an entity positional from the built index", async () => {
    await expect(
      runComplete(
        ["block", "lookup", "ex:B"],
        [lookupModule],
        indexCompletionEnv(cwd),
      ),
    ).resolves.toEqual(["ex:Button"]);
  });
});
