/**
 * Storeless completion of a pack lookup's entity table (PROTECTED).
 *
 * A pack lookup projects a variadic positional with `complete: { kind: "entity",
 * type }`; the `__complete` resolver must fill it from the active pack's
 * `index.json` — a plain JSON read — WITHOUT ever constructing the ke store. The
 * store factory is spied to prove it stays cold on the completion path.
 */

import { describe, expect, it, type Mock, vi } from "vitest";

// Spy the ke store factory: it must NEVER be called while resolving completions.
vi.mock("@canonical/ke", async (importActual) => {
  const actual = await importActual<typeof import("@canonical/ke")>();
  return { ...actual, createStore: vi.fn(actual.createStore) };
});

import { createStore } from "@canonical/ke";
import { compilePack } from "../packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../render/prefixes.js";
import type { CapabilityModule } from "../spec/types.js";
import { buildCompletionModel, complete } from "./complete.js";
import { createIndexEntityReader } from "./entitySource.js";

// A pack whose lookup completes over the embedded index's `ex:Component` type.
const module: CapabilityModule = {
  name: "widget",
  verbs: compilePack(
    {
      noun: "widget",
      lookup: {
        source: "sparql",
        by: "ex:componentName",
        type: "ex:Component",
      },
    },
    "test:widget",
    DEFAULT_PREFIX_MAP,
  ),
};

// The completion model keys positionals by the verb path joined on NUL.
const LOOKUP_KEY = ["widget", "lookup"].join(String.fromCharCode(0));

describe("completion — entity table (storeless, PROTECTED)", () => {
  it("resolves entity names from the index without booting the store", () => {
    (createStore as unknown as Mock).mockClear();
    const model = buildCompletionModel([module]);
    expect(model.positionals[LOOKUP_KEY]?.[0]).toEqual({
      kind: "entity",
      type: "ex:Component",
    });

    const reader = createIndexEntityReader(process.cwd());
    const matches = complete(["widget", "lookup", "ex:But"], model, reader);
    expect(matches).toContain("ex:Button");
    // The store factory was never called — the index read is storeless.
    expect((createStore as unknown as Mock).mock.calls.length).toBe(0);
  });

  it("returns synchronously (no async store boot on the fast path)", () => {
    const reader = createIndexEntityReader(process.cwd());
    const result = reader("ex:Component", "ex:");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain("ex:Button");
    expect((createStore as unknown as Mock).mock.calls.length).toBe(0);
  });
});
