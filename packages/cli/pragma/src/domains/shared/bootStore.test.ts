import { createStore } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGraphLoaderPlugin } from "./bootStore.js";
import { clearBootWarnings, drainBootWarnings } from "./bootWarnings.js";

const PREFIXES = { ds: "https://ds.canonical.com/" };

const goodGraph = (path: string, subject: string) => ({
  path,
  content: `@prefix ds: <https://ds.canonical.com/>.\nds:${subject} a ds:Component.\n`,
  format: "turtle" as const,
});

/** Mirrors the malformed `ds:hasSubcomponent ds:global..` shipped by upstream. */
const badGraph = (path: string) => ({
  path,
  content:
    "@prefix ds: <https://ds.canonical.com/>.\nds:global.component.broken a ds:Component;\n    ds:hasSubcomponent ds:global...\n",
  format: "turtle" as const,
});

async function countTriples(
  graphs: readonly ReturnType<typeof goodGraph>[],
): Promise<number> {
  const store = await createStore({
    sources: [],
    prefixes: PREFIXES,
    plugins: [createGraphLoaderPlugin(graphs)],
  });
  // Always dispose the WASM-backed store so it can't leak across tests.
  try {
    const result = await store.query(
      "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }",
    );
    return Number(
      result.type === "select" ? (result.bindings[0]?.n ?? "0") : "0",
    );
  } finally {
    store.dispose();
  }
}

let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  stderrSpy.mockRestore();
});

const stderrText = (): string =>
  stderrSpy.mock.calls.map((call) => String(call[0])).join("");

describe("createGraphLoaderPlugin", () => {
  it("loads every graph when all are well-formed", async () => {
    const count = await countTriples([
      goodGraph("a.ttl", "global.component.a"),
      goodGraph("b.ttl", "global.component.b"),
    ]);
    expect(count).toBe(2);
    expect(stderrText()).toBe("");
  });

  it("skips a malformed graph but still boots and loads the good ones", async () => {
    const count = await countTriples([
      goodGraph("a.ttl", "global.component.a"),
      badGraph("data/global/component/broken.ttl"),
      goodGraph("b.ttl", "global.component.b"),
    ]);
    // The two good graphs load; the malformed one is skipped, not fatal.
    expect(count).toBe(2);
  });

  it("records the offending file path and parse error on the warning channel", async () => {
    clearBootWarnings();
    await countTriples([badGraph("data/global/component/broken.ttl")]);
    // Nothing hits stderr at load time — entry points flush the channel.
    expect(stderrText()).toBe("");
    const warnings = drainBootWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe("malformed-graph");
    expect(warnings[0]?.subject).toBe("data/global/component/broken.ttl");
    expect(warnings[0]?.detail).toBeTruthy();
  });
});
