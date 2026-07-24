import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { runComplete } from "./complete.js";
import { createIndexEntityReader, indexCompletionEnv } from "./entitySource.js";

/** A fresh cwd with no lock → the reader falls back to the embedded pack. */
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-entity-"));

/** A project whose lock points at a crafted index.json in a temp pack cache. */
function projectWithIndex(index: unknown): string {
  const cwd = mkdtempSync(join(tmpdir(), "pragma-idx-cwd-"));
  const cache = mkdtempSync(join(tmpdir(), "pragma-idx-cache-"));
  vi.stubEnv("XDG_CACHE_HOME", cache);
  writeFileSync(
    join(cwd, "pragma.lock.json"),
    JSON.stringify({ contentHash: "testhash" }),
  );
  const packDir = join(cache, "pragma", "packs", "testhash");
  mkdirSync(packDir, { recursive: true });
  writeFileSync(join(packDir, "index.json"), JSON.stringify(index));
  return cwd;
}

/** A crafted index exercising the index / prompts / tiers / prefixes sources. */
const CRAFTED_INDEX = {
  version: 2,
  contentHash: "testhash",
  prefixes: { ex: "https://example.com/", ds: "https://ds.canonical.com/" },
  instanceCountByType: {},
  entities: [
    { name: "ex:Button", type: "ex:Component" },
    { name: "ds:prompt.build", type: "ds:Prompt", label: "build-a-block" },
    {
      name: "ds:tier.lxd",
      type: "ds:Tier",
      label: "LXD",
      altNames: ["apps/lxd"],
    },
    { name: "ds:tier.core", type: "ds:Tier", label: "core" },
  ],
};

describe("indexCompletionEnv — multi-source names(ref)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("index: entity names of a prefixed type", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    expect(await env.names({ from: "index", type: "ex:Component" })).toEqual([
      "ex:Button",
    ]);
  });

  it("prompts: ds:Prompt entities emit label || name", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    expect(await env.names({ from: "prompts" })).toEqual(["build-a-block"]);
  });

  it("tiers: emit ds:name (altNames) when present, else label ?? name", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    // apps/lxd from altNames (the ds:name); core from the label fallback.
    expect(await env.names({ from: "tiers" })).toEqual(["apps/lxd", "core"]);
  });

  it("prefixes: the index's prefixes ∪ the default display map", async () => {
    const env = indexCompletionEnv(projectWithIndex(CRAFTED_INDEX));
    const prefixes = await env.names({ from: "prefixes" });
    expect(prefixes).toContain("ex"); // from the index
    expect(prefixes).toContain("ds"); // default map
    expect(prefixes).toContain("rdfs"); // default map
  });

  it("skills: names from the project skills root, walked once (memoized)", async () => {
    const cwd = projectWithIndex(CRAFTED_INDEX);
    vi.stubEnv(
      "XDG_DATA_HOME",
      mkdtempSync(join(tmpdir(), "pragma-idx-data-")),
    );
    const skillDir = join(cwd, ".pragma", "skills", "docx");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: docx\ndescription: Word docs.\n---\n",
    );
    const env = indexCompletionEnv(cwd);
    expect(await env.names({ from: "skills" })).toEqual(["docx"]);
    // A second read returns the same list (one filesystem walk per env).
    expect(await env.names({ from: "skills" })).toEqual(["docx"]);
  });

  it("missing sources degrade to [] (prefixes still lists the default map)", async () => {
    const env = indexCompletionEnv(
      projectWithIndex({
        version: 2,
        contentHash: "testhash",
        prefixes: {},
        instanceCountByType: {},
        entities: [{ name: "ex:Button", type: "ex:Component" }],
      }),
    );
    expect(await env.names({ from: "prompts" })).toEqual([]);
    expect(await env.names({ from: "tiers" })).toEqual([]);
    expect(await env.names({ from: "prefixes" })).toContain("ds");
  });
});

describe("entity source contract (PROTECTED)", () => {
  it("reads the embedded index storelessly, filtering by type + partial", () => {
    const read = createIndexEntityReader(freshCwd());

    // Abox individuals of ex:Component, sorted.
    expect(read("ex:Component", "")).toEqual([
      "ex:Button",
      "ex:Card",
      "ex:Dialog",
    ]);
    // Tbox class.
    expect(read("owl:Class", "")).toEqual(["ex:Component"]);
    // Partial-prefix filter.
    expect(read("ex:Component", "ex:B")).toEqual(["ex:Button"]);
    // Unknown type → no matches (never throws).
    expect(read("ds:Nope", "")).toEqual([]);
  });

  it("relies only on the frozen { name, type } minimum", () => {
    const read = createIndexEntityReader(freshCwd());
    // Every result is a bare name token (string), usable with no other field.
    for (const name of read("ex:Component", "")) {
      expect(typeof name).toBe("string");
      expect(name.startsWith("ex:")).toBe(true);
    }
  });

  it("is fast (well under the 50ms storeless budget)", () => {
    const read = createIndexEntityReader(freshCwd());
    const start = performance.now();
    read("ex:Component", "");
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe("__complete entity tier wiring", () => {
  const lookupModule: CapabilityModule = {
    name: "fixture-block",
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
            complete: {
              kind: "names",
              source: { from: "index", type: "ex:Component" },
            },
          },
        ],
        output: {
          formatters: {
            plain: String,
            llm: String,
            json: (d) => JSON.stringify(d),
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

  it("resolves a positional entity param through the wired env", async () => {
    // The bin fast path and the __complete verb wire this exact env: the
    // index-backed reader over cwd, adapted to the resolver's EntityNameReader.
    await expect(
      runComplete(
        ["block", "lookup", "ex:B"],
        [lookupModule],
        indexCompletionEnv(freshCwd()),
      ),
    ).resolves.toEqual(["ex:Button"]);
    // Without the env, the entity tier yields nothing (grammar-only).
    await expect(
      runComplete(["block", "lookup", "ex:B"], [lookupModule]),
    ).resolves.toEqual([]);
  });
});
