import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { runComplete } from "./complete.js";
import { createIndexEntityReader, indexCompletionEnv } from "./entitySource.js";

/** A fresh cwd with no lock → the reader falls back to the embedded pack. */
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-entity-"));

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
            complete: { kind: "entity", type: "ex:Component" },
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
