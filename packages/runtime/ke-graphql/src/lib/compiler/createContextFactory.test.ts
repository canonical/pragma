import type { Store } from "@canonical/ke";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MappedIR, NameMap, NamespaceInfo } from "../shared/index.js";
import createContextFactory from "./createContextFactory.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const nameMap: NameMap = {
  toGraphQL: () => undefined,
  toOWL: () => undefined,
  entries: () => [][Symbol.iterator](),
};

const namespaces = new Map<string, NamespaceInfo>();

// Minimal MappedIR: the loaders read `mapped` only inside their batch
// functions (never invoked here — no .load() call), so empty maps suffice.
const mapped = {
  types: new Map(),
  interfaces: new Map(),
  unions: new Map(),
  nameMap,
  namespaces,
  ir: {
    classes: new Map(),
    properties: new Map(),
    namespaces: new Map(),
    extraction: {} as MappedIR["ir"]["extraction"],
  },
} as unknown as MappedIR;

const store = {} as Store;

describe("default runtime-warning handler", () => {
  it("logs each distinct (property, value) coercion failure exactly once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = createContextFactory(mapped, {})(store);

    ctx.warn({ property: "ex:count", value: "x", reason: "not an integer" });
    // identical key — deduplicated, no second log
    ctx.warn({ property: "ex:count", value: "x", reason: "not an integer" });
    // distinct value — logged
    ctx.warn({ property: "ex:count", value: "y", reason: "not an integer" });

    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      'cannot coerce "x" on ex:count',
    );
    expect(String(warn.mock.calls[0]?.[0])).toContain("not an integer");
  });

  it("uses the supplied onRuntimeWarning handler when provided", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const seen: string[] = [];
    const ctx = createContextFactory(mapped, {
      onRuntimeWarning: (w) => seen.push(w.value),
    })(store);

    ctx.warn({ property: "ex:count", value: "z", reason: "nope" });
    ctx.warn({ property: "ex:count", value: "z", reason: "nope" });

    expect(seen).toEqual(["z", "z"]);
    expect(warn).not.toHaveBeenCalled();
  });
});
