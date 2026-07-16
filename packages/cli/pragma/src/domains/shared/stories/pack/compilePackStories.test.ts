import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import {
  createTestStore,
  RECIPE_PREFIXES,
  RECIPE_STORY,
  RECIPE_TTL,
} from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime } from "../../types/index.js";
import compilePackStories from "./compilePackStories.js";
import type { StoryPackDefinition } from "./types.js";

const PREFIXES = { ...DEFAULT_PREFIX_MAP, ...RECIPE_PREFIXES };

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

// Pack v1: value-free filters (data-driven value sets) and free-text search.
describe("compilePackStories — value-free filters and search", () => {
  /** RECIPE_STORY with a value-free category filter and a name search. */
  const SEARCHABLE_STORY: StoryPackDefinition = {
    ...RECIPE_STORY,
    list: {
      ...RECIPE_STORY.list,
      filters: [{ param: "category", variable: "category" }],
      search: { variables: ["name"] },
    },
  };

  it("projects a value-free filter as a plain string parameter", () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    const param = list.params.find((p) => p.name === "category");
    expect(param?.type).toBe("string");
    expect(param?.enum).toBeUndefined();
  });

  it("filters rows by case-insensitive equality without a declared set", async () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, { category: "SOUP" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("returns no rows (not an error) for an unknown filter value", async () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    await expect(list.resolve(rt, { category: "dinner" })).resolves.toEqual([]);
  });

  it("projects a `search` string parameter", () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    const param = list.params.find((p) => p.name === "search");
    expect(param?.type).toBe("string");
    expect(param?.description).toContain("name");
  });

  it("keeps rows whose searched variables contain the term", async () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, { search: "gaz" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("applies search after filters, conjunctively", async () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    const rows = await list.resolve(rt, {
      category: "breakfast",
      search: "gaz",
    });
    expect(rows).toEqual([]);
  });

  it("skips the generated filter example when no filter declares values", () => {
    const { list } = compilePackStories(SEARCHABLE_STORY, "test", PREFIXES);
    expect(
      list.examples.some((example) => example.includes("--category")),
    ).toBe(false);
  });
});

// Pack v1: extra list-shaped verbs compiled through the list machinery.
describe("compilePackStories — extra verbs", () => {
  const STORY_WITH_VERB: StoryPackDefinition = {
    ...RECIPE_STORY,
    verbs: [
      {
        verb: "categories",
        description: "List recipe categories",
        query:
          "SELECT ?name (COUNT(?uri) AS ?count) WHERE { ?uri a ex:Recipe ; ex:category ?name } GROUP BY ?name ORDER BY ?name",
        columns: [{ field: "name" }, { field: "count" }],
      },
    ],
  };

  it("compiles each declared verb into a read story on the noun", async () => {
    const { verbs } = compilePackStories(STORY_WITH_VERB, "test", PREFIXES);
    expect(verbs).toHaveLength(1);
    const categories = verbs.at(0);
    expect(categories?.noun).toBe("recipe");
    expect(categories?.verb).toBe("categories");
    expect(categories?.description).toBe("List recipe categories");
    const rows = await categories?.resolve(rt, {});
    expect(rows).toEqual([
      { name: "breakfast", count: "1" },
      { name: "soup", count: "1" },
    ]);
    expect(categories?.toEnvelope(rows ?? [])).toEqual({
      data: rows,
      meta: { count: 2 },
    });
  });

  it("renders extra verbs through the generic list renderer", async () => {
    const { verbs } = compilePackStories(STORY_WITH_VERB, "test", PREFIXES);
    const categories = verbs.at(0);
    const rows = (await categories?.resolve(rt, {})) ?? [];
    const llm = categories?.formatters.llm(rows) ?? "";
    expect(llm).toContain("## Recipe categories (2)");
    expect(llm).toContain("breakfast");
  });

  it("compiles no extra verbs when none are declared", () => {
    const { verbs } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    expect(verbs).toEqual([]);
  });
});

// Pack v1: the generic sample verb.
describe("compilePackStories — sample", () => {
  const STORY_WITH_SAMPLE: StoryPackDefinition = {
    ...RECIPE_STORY,
    lookup: {
      // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
      ...RECIPE_STORY.lookup!,
      sample: true,
    },
  };

  it("draws N entities resolved through the lookup path", async () => {
    const { sample } = compilePackStories(STORY_WITH_SAMPLE, "test", PREFIXES);
    expect(sample?.noun).toBe("recipe");
    expect(sample?.verb).toBe("sample");
    const data = await sample?.resolve(rt, { count: "2" });
    expect(data?.totalCount).toBe(2);
    expect(data?.samples.map((entity) => entity.name).sort()).toEqual([
      "Gazpacho",
      "Pancakes",
    ]);
    // Full lookup shape, not just names.
    expect(
      data?.samples.every((entity) => typeof entity.instructions === "string"),
    ).toBe(true);
  });

  it("clamps the requested count and rejects non-integers", async () => {
    const { sample } = compilePackStories(STORY_WITH_SAMPLE, "test", PREFIXES);
    const data = await sample?.resolve(rt, { count: "99" });
    expect(data?.samples.length).toBeLessThanOrEqual(5);
    await expect(sample?.resolve(rt, { count: "abc" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("envelopes samples with totalCount and nextSteps", async () => {
    const { sample } = compilePackStories(STORY_WITH_SAMPLE, "test", PREFIXES);
    const data = await sample?.resolve(rt, {});
    if (!data || !sample) throw new Error("expected sample data");
    const envelope = sample.toEnvelope(data);
    expect(envelope.meta).toEqual({ count: data.samples.length });
    const payload = envelope.data as {
      totalCount: number;
      nextSteps: string[];
    };
    expect(payload.totalCount).toBe(2);
    expect(payload.nextSteps.join(" ")).toContain("recipe_lookup");
  });

  it("renders samples via the lookup formatters under a count header", async () => {
    const { sample } = compilePackStories(STORY_WITH_SAMPLE, "test", PREFIXES);
    const data = await sample?.resolve(rt, { count: "2" });
    if (!data || !sample) throw new Error("expected sample data");
    const llm = sample.formatters.llm(sample.toOutput(data, {}));
    expect(llm).toContain("Showing 2 of 2 recipe entries");
    expect(llm).toContain("## ");
  });

  it("honors a declared default count", async () => {
    const configured: StoryPackDefinition = {
      ...RECIPE_STORY,
      lookup: {
        // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
        ...RECIPE_STORY.lookup!,
        sample: { count: 1 },
      },
    };
    const { sample } = compilePackStories(configured, "test", PREFIXES);
    const data = await sample?.resolve(rt, {});
    expect(data?.samples).toHaveLength(1);
  });

  it("compiles no sample story when the capability is not declared", () => {
    const { sample } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    expect(sample).toBeUndefined();
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

// Pack v1: IRI/prefixed-name addressing and glob expansion on lookups.
describe("compilePackStories — lookup by IRI and glob", () => {
  it("resolves an absolute IRI to the exact entity", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(
      rt,
      ["http://example.org/recipes/pancakes"],
      {},
    );
    expect(result?.errors).toEqual([]);
    expect(result?.results.at(0)?.name).toBe("Pancakes");
  });

  it("resolves a prefixed name through the merged prefix map", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["ex:gazpacho"], {});
    expect(result?.errors).toEqual([]);
    expect(result?.results.at(0)?.name).toBe("Gazpacho");
  });

  it("collects an INVALID_INPUT entry for an unknown prefix", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["zz:nonexistent"], {});
    expect(result?.results).toHaveLength(0);
    expect(result?.errors.at(0)?.code).toBe("INVALID_INPUT");
  });

  it("collects ENTITY_NOT_FOUND for an IRI naming no entity", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["ex:missing"], {});
    expect(result?.results).toHaveLength(0);
    expect(result?.errors.at(0)?.code).toBe("ENTITY_NOT_FOUND");
  });

  it("expands glob queries against the entity name list", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["*a*"], {});
    expect(result?.errors).toEqual([]);
    expect(result?.results.map((entity) => entity.name).sort()).toEqual([
      "Gazpacho",
      "Pancakes",
    ]);
  });

  it("reports EMPTY_RESULTS for a glob matching nothing", async () => {
    const { lookup } = compilePackStories(RECIPE_STORY, "test", PREFIXES);
    const result = await lookup?.resolve(rt, ["Zebra*", "Pancakes"], {});
    expect(result?.results.at(0)?.name).toBe("Pancakes");
    const error = result?.errors.at(0);
    expect(error?.code).toBe("EMPTY_RESULTS");
    expect(error?.query).toBe("Zebra*");
  });
});

// ---------------------------------------------------------------------------
// Pack v1: multi-valued expand projections (nested SPARQL)
// ---------------------------------------------------------------------------

const RECIPE_TTL_WITH_INGREDIENTS = `${RECIPE_TTL}
ex:pancakes ex:ingredient [ ex:label "Flour" ; ex:amount "200g" ] .
ex:pancakes ex:ingredient [ ex:label "Milk" ; ex:amount "300ml" ] .
ex:gazpacho ex:ingredient [ ex:label "Tomato" ; ex:amount "1kg" ] .
`;

/** RECIPE_STORY with a multi-valued `ingredients` expand. */
const RECIPE_STORY_WITH_EXPAND: StoryPackDefinition = {
  ...RECIPE_STORY,
  lookup: {
    // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
    ...RECIPE_STORY.lookup!,
    expand: [
      {
        name: "ingredients",
        heading: "Ingredients",
        kind: "table",
        relation: "ex:ingredient",
        select: [
          { name: "label", property: "ex:label" },
          { name: "amount", property: "ex:amount" },
        ],
      },
    ],
  },
};

describe("compilePackStories — expand", () => {
  let expandStore: Store;
  let expandCleanup: () => void;
  let expandRt: PragmaRuntime;

  beforeAll(async () => {
    const result = await createTestStore({
      ttl: RECIPE_TTL_WITH_INGREDIENTS,
      prefixes: RECIPE_PREFIXES,
    });
    expandStore = result.store;
    expandCleanup = result.cleanup;
    expandRt = { store: expandStore } as PragmaRuntime;
  });

  afterAll(() => expandCleanup());

  it("attaches expanded child rows as an array on the entity", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_WITH_EXPAND,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {});
    const entity = result?.results.at(0) as
      | { ingredients?: Array<Record<string, string>> }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
    const labels = entity?.ingredients?.map((i) => i.label).sort();
    expect(labels).toEqual(["Flour", "Milk"]);
    const flour = entity?.ingredients?.find((i) => i.label === "Flour");
    expect(flour?.amount).toBe("200g");
  });

  it("renders the expand as a section through the generic renderer", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_WITH_EXPAND,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {});
    const entity = result?.results.at(0);
    if (!entity || !lookup) throw new Error("expected entity");
    const llm = lookup.formatters.llm(
      lookup.toFmtInput(entity, { surface: "cli", detailed: true, params: {} }),
    );
    expect(llm).toContain("Ingredients");
    expect(llm).toContain("Flour");
    expect(llm).toContain("200g");
  });

  it("returns an empty array when the entity has no children", async () => {
    const noExpand: StoryPackDefinition = {
      ...RECIPE_STORY_WITH_EXPAND,
      lookup: {
        // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
        ...RECIPE_STORY_WITH_EXPAND.lookup!,
        expand: [
          {
            name: "steps",
            relation: "ex:step",
            select: [{ name: "text", property: "ex:text" }],
          },
        ],
      },
    };
    const { lookup } = compilePackStories(noExpand, "test", PREFIXES);
    const result = await lookup?.resolve(expandRt, ["Gazpacho"], {});
    const entity = result?.results.at(0) as { steps?: unknown[] } | undefined;
    expect(entity?.steps).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Disclosure capability: level-gated expands + derived --detail
  // -------------------------------------------------------------------------

  /** RECIPE_STORY_WITH_EXPAND with `ingredients` gated to a "detailed" level. */
  const RECIPE_STORY_DISCLOSURE: StoryPackDefinition = {
    ...RECIPE_STORY_WITH_EXPAND,
    lookup: {
      // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
      ...RECIPE_STORY_WITH_EXPAND.lookup!,
      expand: [
        {
          name: "ingredients",
          heading: "Ingredients",
          kind: "table",
          relation: "ex:ingredient",
          select: [
            { name: "label", property: "ex:label" },
            { name: "amount", property: "ex:amount" },
          ],
          level: "detailed",
        },
      ],
      disclosure: { levels: ["summary", "detailed"] },
    },
  };

  it("derives a `detail` param enumerated from the declared levels", () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const param = lookup?.params?.find((p) => p.name === "detail");
    expect(param?.enum).toEqual(["summary", "detailed"]);
  });

  it("omits a level-gated expand at the base level (no fetch)", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {});
    const entity = result?.results.at(0) as
      | { ingredients?: unknown }
      | undefined;
    expect(entity?.ingredients).toBeUndefined();
  });

  it("includes a level-gated expand when --detail selects its level", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {
      detail: "detailed",
    });
    const entity = result?.results.at(0) as
      | { ingredients?: unknown[] }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
  });

  it("honors the global config.detail default when no flag is passed", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const configuredRt = {
      store: expandStore,
      config: { detail: "detailed" },
    } as PragmaRuntime;
    const result = await lookup?.resolve(configuredRt, ["Pancakes"], {});
    const entity = result?.results.at(0) as
      | { ingredients?: unknown[] }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
  });

  it("lets an explicit --detail override the config default", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const configuredRt = {
      store: expandStore,
      config: { detail: "detailed" },
    } as PragmaRuntime;
    const result = await lookup?.resolve(configuredRt, ["Pancakes"], {
      detail: "summary",
    });
    const entity = result?.results.at(0) as
      | { ingredients?: unknown }
      | undefined;
    expect(entity?.ingredients).toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // Legacy disclosure alias flags + the MCP full-data default
  // ---------------------------------------------------------------------

  /** Three levels so alias precedence (highest wins) is observable. */
  const RECIPE_STORY_THREE_LEVELS: StoryPackDefinition = {
    ...RECIPE_STORY_WITH_EXPAND,
    lookup: {
      // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
      ...RECIPE_STORY_WITH_EXPAND.lookup!,
      expand: [
        {
          name: "ingredients",
          relation: "ex:ingredient",
          select: [{ name: "label", property: "ex:label" }],
          level: "digest",
        },
      ],
      disclosure: { levels: ["summary", "digest", "detailed"] },
    },
  };

  it("derives a boolean alias flag per non-base level", () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_THREE_LEVELS,
      "test",
      PREFIXES,
    );
    const names = (lookup?.params ?? []).map((param) => param.name);
    expect(names).toEqual(["detail", "digest", "detailed"]);
    const digest = lookup?.params?.find((param) => param.name === "digest");
    expect(digest?.type).toBe("boolean");
    expect(digest?.default).toBe(false);
  });

  it("an alias flag implies its level", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_THREE_LEVELS,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {
      digest: true,
    });
    const entity = result?.results.at(0) as
      | { ingredients?: unknown[] }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
  });

  it("an explicit --detail beats an alias flag", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_THREE_LEVELS,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {
      detail: "summary",
      detailed: true,
    });
    const entity = result?.results.at(0) as
      | { ingredients?: unknown }
      | undefined;
    expect(entity?.ingredients).toBeUndefined();
  });

  it("the highest requested alias level wins when several are set", async () => {
    /** Gate the expand at `detailed` so digest-vs-detailed is observable. */
    const gatedAtDetailed: StoryPackDefinition = {
      ...RECIPE_STORY_THREE_LEVELS,
      lookup: {
        // biome-ignore lint/style/noNonNullAssertion: fixture always declares lookup
        ...RECIPE_STORY_THREE_LEVELS.lookup!,
        expand: [
          {
            name: "ingredients",
            relation: "ex:ingredient",
            select: [{ name: "label", property: "ex:label" }],
            level: "detailed",
          },
        ],
      },
    };
    const { lookup } = compilePackStories(gatedAtDetailed, "test", PREFIXES);
    const result = await lookup?.resolve(expandRt, ["Pancakes"], {
      digest: true,
      detailed: true,
    });
    const entity = result?.results.at(0) as
      | { ingredients?: unknown[] }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
  });

  it("an MCP call with no explicit choice gets the highest level", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(
      expandRt,
      ["Pancakes"],
      {},
      {
        surface: "mcp",
        detailed: false,
        params: {},
      },
    );
    const entity = result?.results.at(0) as
      | { ingredients?: unknown[] }
      | undefined;
    expect(entity?.ingredients).toHaveLength(2);
  });

  it("the global config.detail outranks the MCP full-data default", async () => {
    // Counterpart of the CLI config.detail test above: a user-configured
    // global `detail: summary` must win over the MCP surface fallback.
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const configuredRt = {
      store: expandStore,
      config: { detail: "summary" },
    } as PragmaRuntime;
    const result = await lookup?.resolve(
      configuredRt,
      ["Pancakes"],
      {},
      { surface: "mcp", detailed: false, params: {} },
    );
    const entity = result?.results.at(0) as
      | { ingredients?: unknown }
      | undefined;
    expect(entity?.ingredients).toBeUndefined();
  });

  it("an MCP alias explicitly false opts down to the base level", async () => {
    const { lookup } = compilePackStories(
      RECIPE_STORY_DISCLOSURE,
      "test",
      PREFIXES,
    );
    const result = await lookup?.resolve(
      expandRt,
      ["Pancakes"],
      { detailed: false },
      { surface: "mcp", detailed: false, params: {} },
    );
    const entity = result?.results.at(0) as
      | { ingredients?: unknown }
      | undefined;
    expect(entity?.ingredients).toBeUndefined();
  });
});

describe("compilePackStories — list emptyRecovery", () => {
  const emptyDefinition: StoryPackDefinition = {
    noun: "recipe",
    list: {
      query:
        "SELECT ?uri ?name ?category WHERE { ?uri a ex:Nonesuch ; ex:name ?name ; ex:category ?category }",
      columns: [{ field: "name" }],
      filters: [
        {
          param: "category",
          variable: "category",
          values: ["breakfast", "soup"],
        },
      ],
      emptyRecovery: {
        message: "Install the cookbook package.",
        cli: "bun add -D cookbook",
      },
    },
  };

  it("throws a typed EMPTY_RESULTS with the declared recovery when the store has no rows", async () => {
    const { list } = compilePackStories(emptyDefinition, "test", PREFIXES);
    const error = await list.resolve(rt, {}).then(
      () => undefined,
      (thrown) => thrown as PragmaError,
    );
    expect(error?.code).toBe("EMPTY_RESULTS");
    expect(error?.recovery?.cli).toBe("bun add -D cookbook");
  });

  it("recovers toward unfiltered listing when a filter value was active", async () => {
    const { list } = compilePackStories(emptyDefinition, "test", PREFIXES);
    const error = await list.resolve(rt, { category: "soup" }).then(
      () => undefined,
      (thrown) => thrown as PragmaError,
    );
    expect(error?.code).toBe("EMPTY_RESULTS");
    expect(error?.filters).toEqual({ category: "soup" });
    expect(error?.recovery?.cli).toBe("pragma recipe list");
  });

  it("keeps rendering empty lists for packs without the declaration", async () => {
    const noRecovery: StoryPackDefinition = {
      ...emptyDefinition,
      list: {
        query: emptyDefinition.list.query,
        columns: emptyDefinition.list.columns,
      },
    };
    const { list } = compilePackStories(noRecovery, "test", PREFIXES);
    await expect(list.resolve(rt, {})).resolves.toEqual([]);
  });
});
