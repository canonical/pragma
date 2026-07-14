import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import {
  createTestStore,
  RECIPE_PREFIXES,
  RECIPE_STORY,
  RECIPE_TTL,
} from "#testing";
import { PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime } from "../../types/index.js";
import compilePackStories from "./compilePackStories.js";

const PREFIXES = { ...PREFIX_MAP, ...RECIPE_PREFIXES };

let store: Store;
let cleanup: () => void;
let rt: PragmaRuntime;

beforeAll(async () => {
  const result = await createTestStore({
    ttl: RECIPE_TTL,
    prefixes: RECIPE_PREFIXES,
  });
  store = result.store;
  cleanup = result.cleanup;
  rt = { store } as PragmaRuntime;
});

afterAll(() => cleanup());

describe("compilePackStories — list", () => {
  it("resolves the pack's preferred query into rows", async () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, {});
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho", "Pancakes"]);
    expect(list.toEnvelope(rows)).toEqual({
      data: rows,
      meta: { count: 2 },
    });
  });

  it("renders the generic formatters with compacted prefixes", async () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, {});
    const plain = list.formatters.plain(rows);
    expect(plain).toContain("Pancakes");
    expect(plain).toContain("breakfast");
    const llm = list.formatters.llm(rows);
    expect(llm).toContain("## Recipe (2)");
    expect(llm).toContain("`ex:gazpacho`");
    expect(JSON.parse(list.formatters.json(rows))).toHaveLength(2);
  });
});

describe("compilePackStories — list filters", () => {
  it("projects declared filters as enum story parameters", () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const param = list.params.at(0);
    expect(param?.name).toBe("category");
    expect(param?.type).toBe("string");
    expect(param?.enum).toEqual(["breakfast", "soup"]);
  });

  it("filters resolved rows by the provided value", async () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, { category: "soup" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
    expect(list.toEnvelope(rows).meta).toEqual({ count: 1 });
  });

  it("canonicalizes case-insensitive input through resolve", async () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, { category: "SOUP" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("rejects a value outside the declared set with INVALID_INPUT", async () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    await expect(
      list.resolve(rt, { category: "dinner" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("mentions the first filter in the examples", () => {
    const { list } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    expect(list.examples).toContain("pragma recipe list --category breakfast");
  });
});

describe("compilePackStories — lookup", () => {
  it("looks an entity up by name, case-insensitively", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["pancakes"], {});
    expect(result?.results).toHaveLength(1);
    const entity = result?.results.at(0);
    expect(entity?.name).toBe("Pancakes");
    expect(entity?.category).toBe("breakfast");
    expect(entity?.instructions).toBe("Mix, fry, flip.");
  });

  it("renders fields and sections through the generic lookup renderer", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["Gazpacho"], {});
    const entity = result?.results.at(0);
    expect(entity).toBeDefined();
    if (!entity || !lookup) throw new Error("expected entity");
    const llm = lookup.formatters.llm(
      lookup.toFmtInput(entity, {
        surface: "cli",
        detailed: false,
        params: {},
      }),
    );
    expect(llm).toContain("Gazpacho");
    expect(llm).toContain("soup");
    expect(llm).toContain("Blend everything cold.");
  });

  it("collects not-found errors with ranked suggestions", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["Pancake"], {});
    expect(result?.results).toHaveLength(0);
    const error = result?.errors.at(0);
    expect(error?.code).toBe("ENTITY_NOT_FOUND");
    expect(error?.suggestions).toContain("Pancakes");
  });

  it("rejects empty names with a recovery hint", () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    expect(() => {
      const error = lookup?.emptyNamesError?.();
      if (error) throw error;
    }).toThrow(PragmaError);
  });

  it("completes names from the store", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const ctx = {
      cwd: "/tmp",
      globalFlags: { llm: false, format: "text" as const, verbose: false },
      store,
    };
    await expect(lookup?.complete?.("pan", ctx)).resolves.toEqual(["Pancakes"]);
  });
});
