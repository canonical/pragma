/**
 * Compiler invariants (PROTECTED) — the single pack compiler.
 *
 * Closes fork F3: one grammar, one compiler. Asserts the round-trip
 * (validate∘serialize is identity), the projected verb shapes and
 * `(noun, verb)` uniqueness (storeless), and the SPARQL fetch path end to end
 * against a fixture store (list filter/search, lookup by name, sample).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { PragmaError } from "../error/index.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { kebabCase } from "../spec/emitSurface.js";
import type { VerbSpec } from "../spec/types.js";
import { compileListable, compilePack, compileStoryModule } from "./compile.js";
import { encodeCursor, pageFingerprint } from "./cursor.js";
import { DEFAULT_LIST_LIMIT, MAX_LIST_WINDOW } from "./paging.js";
import type { LookupOutput } from "./resolveEntity.js";
import { parsePackDefinition } from "./schema.js";
import type { PackDefinition, PackPage, PackRow } from "./types.js";
import { distributionSource } from "./types.js";
import { assertUniqueVerbs, verbKey } from "./uniqueness.js";

const PREFIXES = {
  ex: "https://example.org/widgets#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix ex: <https://example.org/widgets#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Widget a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:kind a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:description a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:hasPart a owl:ObjectProperty ; rdfs:domain ex:Widget ; rdfs:range ex:Widget .

ex:button a ex:Widget ; ex:name "Button" ; ex:kind "input" ;
  ex:description "A button." ; ex:hasPart ex:label .
ex:label a ex:Widget ; ex:name "Label" ; ex:kind "display" ;
  ex:description "A label." .
`;

/** A SPARQL-sourced fixture pack exercising list, filter, search, lookup, sample. */
const WIDGET_PACK: PackDefinition = {
  noun: "widget",
  description: "List widgets.",
  list: {
    query: [
      "SELECT ?uri ?name ?kind WHERE {",
      "  ?uri a ex:Widget ; ex:name ?name .",
      "  OPTIONAL { ?uri ex:kind ?kind }",
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "kind", label: "Kind" },
    ],
    filters: [
      { param: "kind", variable: "kind", values: ["input", "display"] },
    ],
    search: { variables: ["name"] },
  },
  lookup: {
    source: "sparql",
    by: "ex:name",
    type: "ex:Widget",
    fields: [
      { name: "description", property: "ex:description", level: "standard" },
    ],
    expand: [
      {
        name: "parts",
        heading: "Parts",
        relation: "ex:hasPart",
        level: "detailed",
        select: [{ name: "name", property: "ex:name" }],
      },
    ],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "summary",
    },
    sample: true,
  },
};

describe("pack compiler — round-trip + shape (PROTECTED, storeless)", () => {
  it("validate∘serialize is identity (JSON round-trips to the same pack)", () => {
    const raw: unknown = JSON.parse(JSON.stringify(WIDGET_PACK));
    expect(parsePackDefinition(raw, "test:widget")).toEqual(WIDGET_PACK);
  });

  it("round-trips a fixed-count sample — the field the no-argument samples declare", () => {
    // `sample.fixedCount` is a documented grammar field (packs/types.ts) that
    // three of the distribution's own stories use and the covenant freezes
    // (`block sample` takes no argument). It was missing from the `.strict()`
    // sample schema, so ANY config- or package-declared story using it died
    // with a fatal CONFIG_ERROR before ever reaching the compiler.
    const lookup = WIDGET_PACK.lookup as NonNullable<PackDefinition["lookup"]>;
    const fixed: PackDefinition = {
      ...WIDGET_PACK,
      lookup: { ...lookup, sample: { fixedCount: true } },
    };
    expect(parsePackDefinition(JSON.parse(JSON.stringify(fixed)), "t")).toEqual(
      fixed,
    );
    // …and the compiler honours it: no `[count]` positional on the sample verb.
    const sample = compilePack(fixed, distributionSource("t"), PREFIXES).find(
      (v) => verbKey(v.path) === "widget sample",
    );
    expect(sample?.params).toEqual([]);
  });

  it("projects list, lookup, and sample verbs with unique keys", () => {
    const verbs = compilePack(
      WIDGET_PACK,
      distributionSource("bundled:widget"),
      PREFIXES,
    );
    expect(verbs.map((v) => verbKey(v.path))).toEqual([
      "widget list",
      "widget lookup",
      "widget sample",
    ]);
    expect(() => assertUniqueVerbs(verbs)).not.toThrow();
  });

  it("projects list filters as params (enum) + a search flag", () => {
    const [list] = compilePack(
      WIDGET_PACK,
      distributionSource("bundled:widget"),
      PREFIXES,
    );
    // The page pair is the KERNEL's, on every list-shaped verb whether the
    // story mentions it or not — see compile.ts#PAGE_PARAMS.
    expect(list?.params.map((p) => p.name)).toEqual([
      "kind",
      "search",
      "limit",
      "after",
    ]);
    const kind = list?.params.find((p) => p.name === "kind");
    expect(kind?.kind).toBe("enum");
    expect(list?.capability.needsStore).toBe(true);
    expect(list?.capability.mcp.expose).toBe(true);
  });

  it("projects the lookup as a variadic name-completing positional + disclosure", () => {
    const verbs = compilePack(
      WIDGET_PACK,
      distributionSource("bundled:widget"),
      PREFIXES,
    );
    const lookup = verbs.find((v) => verbKey(v.path) === "widget lookup");
    const name = lookup?.params.at(0);
    expect(name?.kind).toBe("string[]");
    expect(name?.positional).toBe(true);
    expect(name?.complete).toEqual({
      kind: "names",
      source: { from: "index", type: "ex:Widget" },
    });
    expect(lookup?.disclosure).toEqual({
      levels: ["summary", "standard", "detailed"],
      default: "summary",
    });
  });

  it("honors the pack completion override (opt-out + tune)", () => {
    const baseLookup = WIDGET_PACK.lookup as NonNullable<
      PackDefinition["lookup"]
    >;
    const nameParam = (def: PackDefinition) =>
      compilePack(def, distributionSource("bundled:widget"), PREFIXES)
        .find((v) => verbKey(v.path) === "widget lookup")
        ?.params.at(0);

    // enabled:false opts the family out of completion entirely.
    expect(
      nameParam({
        ...WIDGET_PACK,
        lookup: { ...baseLookup, completion: { enabled: false } },
      })?.complete,
    ).toBeUndefined();

    // match/minChars tune the derived index heuristic.
    expect(
      nameParam({
        ...WIDGET_PACK,
        lookup: {
          ...baseLookup,
          completion: { match: "prefix", minChars: 3 },
        },
      })?.complete,
    ).toEqual({
      kind: "names",
      source: { from: "index", type: "ex:Widget" },
      match: "prefix",
      minChars: 3,
    });
  });
});

describe("the grammar rejects what the compiler cannot build (PROTECTED)", () => {
  // A definition that compiles to a duplicate `(noun, verb)` key or a duplicate
  // CLI option is not merely odd — it throws out of `assembleEffectiveModules`
  // or out of `buildProgram`, both of which run BEFORE the command tree exists.
  // For a package-shipped story that means every command dies, `doctor` and
  // `sources update` included. The collision is a property of the definition,
  // so it is rejected here, where a package story degrades to a dropped file.
  const listShape = {
    query: "SELECT ?uri WHERE { ?uri a ex:Widget }",
    columns: [{ field: "uri" }],
  };
  const parse = (def: unknown) => () =>
    parsePackDefinition(def, "pkg/stories/widget.json");

  it("rejects an extra verb that repeats list, lookup, sample, or itself", () => {
    const lookup = { by: "ex:name", type: "ex:Widget", sample: true };
    expect(
      parse({
        noun: "widget",
        list: listShape,
        verbs: [{ ...listShape, verb: "list" }],
      }),
    ).toThrow(/verb "list" is already compiled/);
    expect(
      parse({
        noun: "widget",
        lookup,
        verbs: [{ ...listShape, verb: "lookup" }],
      }),
    ).toThrow(/verb "lookup" is already compiled/);
    expect(
      parse({
        noun: "widget",
        lookup,
        verbs: [{ ...listShape, verb: "sample" }],
      }),
    ).toThrow(/verb "sample" is already compiled/);
    expect(
      parse({
        noun: "widget",
        list: listShape,
        verbs: [
          { ...listShape, verb: "categories" },
          { ...listShape, verb: "categories" },
        ],
      }),
    ).toThrow(/verb "categories" is already compiled/);
  });

  it("rejects a filter param declared twice, on list or on an extra verb", () => {
    const twice = [
      { param: "kind", variable: "uri", values: ["a"] },
      { param: "kind", variable: "uri", values: ["a"] },
    ];
    expect(
      parse({ noun: "widget", list: { ...listShape, filters: twice } }),
    ).toThrow(/filter param "kind" is declared twice/);
    expect(
      parse({
        noun: "widget",
        list: listShape,
        verbs: [{ ...listShape, verb: "categories", filters: twice }],
      }),
    ).toThrow(/filter param "kind" is declared twice/);
  });

  it("admits a camelCase filter param, and it reaches the flag the projector spells", () => {
    // The grammar and the projector have to agree about what a param name may
    // be. `emitVerb` writes a flag as `--${kebabCase(param)}`, so a two-word
    // dimension only has a readable spelling if the param may carry the hump —
    // and the gate used to refuse the one spelling that projects well while
    // admitting `channelof`, which projects to `--channelof`.
    const definition = parsePackDefinition(
      {
        noun: "widget",
        list: {
          query:
            "SELECT ?uri ?channelOf WHERE { ?uri ex:channelOf ?channelOf }",
          columns: [{ field: "uri" }, { field: "channelOf" }],
          filters: [
            { param: "channelOf", variable: "channelOf", values: ["a"] },
          ],
        },
      },
      "pkg/stories/widget.json",
    );
    const list = compilePack(
      definition,
      distributionSource("pkg/stories/widget.json"),
      PREFIXES,
    ).find((verb) => verbKey(verb.path) === "widget list") as VerbSpec;
    // The MCP key keeps the declared spelling; the CLI flag is its kebab form.
    expect(list.params.map((param) => param.name)).toContain("channelOf");
    expect(`--${kebabCase("channelOf")}`).toBe("--channel-of");
  });

  it("still refuses a filter param that does not start lowercase", () => {
    // A leading capital would kebab to a LEADING DASH, and Commander would
    // register a flag with an empty name — outside every error envelope the
    // CLI owns. The widening is the hump, not the initial.
    expect(
      parse({
        noun: "widget",
        list: {
          ...listShape,
          filters: [{ param: "ChannelOf", variable: "uri", values: ["a"] }],
        },
      }),
    ).toThrow();
  });

  it("still accepts the distinct forms, and they compile to unique keys/params", () => {
    const definition = parsePackDefinition(
      {
        noun: "widget",
        list: {
          ...listShape,
          filters: [
            { param: "kind", variable: "uri", values: ["a"] },
            { param: "tier", variable: "uri", values: ["b"] },
          ],
        },
        verbs: [{ ...listShape, verb: "categories" }],
        lookup: { by: "ex:name", type: "ex:Widget", sample: true },
      },
      "pkg/stories/widget.json",
    );
    const verbs = compilePack(
      definition,
      { label: "pkg/stories/widget.json", origin: "package" },
      PREFIXES,
    );
    expect(verbs.map((v) => verbKey(v.path))).toEqual([
      "widget list",
      "widget categories",
      "widget lookup",
      "widget sample",
    ]);
    expect(() => assertUniqueVerbs(verbs)).not.toThrow();
    expect(verbs.at(0)?.params.map((p) => p.name)).toEqual([
      "kind",
      "tier",
      "limit",
      "after",
    ]);
  });

  it("names the shape a noun must have, not the regex", () => {
    expect(parse({ noun: "Bad Noun", list: listShape })).toThrow(
      /noun: must be lowercase kebab-case/,
    );
  });

  it("rejects an emptyRecovery.cli that names a binary, and names the change", () => {
    // The hint is rendered as `<consuming distribution> <cli>`, so a story
    // carrying the old prefixed form would render `pragma pragma sources
    // update`. Third-party packs are third-party DATA: they get an error that
    // names the grammar change, not a silently doubled string.
    const withCli = (cli: string) => ({
      noun: "widget",
      list: { ...listShape, emptyRecovery: { message: "None.", cli } },
    });
    expect(parse(withCli(`${RECOVERY_CLI_PREFIX}sources update`))).toThrow(
      /WITHOUT the binary name/,
    );
    expect(parse(withCli("sources update"))).not.toThrow();
  });
});

describe("pack compiler — SPARQL fetch path (PROTECTED)", () => {
  let rt: PragmaRuntime;

  beforeAll(async () => {
    ({ rt } = await buildFixtureRuntime({
      ttl: TTL,
      prefixes: PREFIXES,
      detail: "detailed",
    }));
  });

  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  /**
   * The INVALID_INPUT recovery a call raises, which is where a pack error puts
   * the sentence a caller acts on — the factory's own message is the uniform
   * `Invalid <field> "<value>".`
   */
  const recoveryOf = async (call: () => Promise<unknown>): Promise<string> => {
    try {
      await call();
    } catch (error) {
      if (error instanceof PragmaError) {
        expect(error.code).toBe("INVALID_INPUT");
        return error.recovery?.message ?? "";
      }
      throw error;
    }
    throw new Error("expected the call to be refused");
  };

  const run = <R>(verbLabel: string, params: Record<string, unknown>) => {
    const verb = compilePack(
      WIDGET_PACK,
      distributionSource("bundled:widget"),
      PREFIXES,
    ).find((v) => verbKey(v.path) === `widget ${verbLabel}`);
    if (!verb) throw new Error(`no widget ${verbLabel}`);
    return verb.run(params, rt) as Promise<R>;
  };

  it("lists rows in the uniform pack shape", async () => {
    const page = await run<PackPage>("list", {});
    expect(page.rows.map((r) => r.name)).toEqual(["Button", "Label"]);
    expect(page.rows[0]?.uri).toBe("https://example.org/widgets#button");
    // The whole population fits the default page, so nothing is withheld and
    // there is no cursor to spend.
    expect(page.nextAfter).toBeUndefined();
    expect(page.limit).toBe(DEFAULT_LIST_LIMIT);
  });

  it("filters by an enum value, compiled into the query", async () => {
    const page = await run<PackPage>("list", { kind: "input" });
    expect(page.rows.map((r) => r.name)).toEqual(["Button"]);
  });

  it("searches case-insensitively", async () => {
    const page = await run<PackPage>("list", { search: "lab" });
    expect(page.rows.map((r) => r.name)).toEqual(["Label"]);
  });

  it("pages inside the query: a page, its successor, and their union", async () => {
    const whole = await run<PackPage>("list", {});
    const first = await run<PackPage>("list", { limit: 1 });
    expect(first.rows).toEqual([whole.rows[0]]);
    expect(first.nextAfter).toBeTypeOf("string");
    const second = await run<PackPage>("list", {
      limit: 1,
      after: first.nextAfter,
    });
    expect(second.rows).toEqual([whole.rows[1]]);
    // The last page reports no successor, and one past it is a calm empty page
    // rather than an error.
    expect(second.nextAfter).toBeUndefined();
    const past = await run<PackPage>("list", {
      limit: 1,
      after: encodeCursor(
        9,
        pageFingerprint([WIDGET_PACK.list?.query ?? "", "[]", "null"]),
      ),
    });
    expect(past.rows).toEqual([]);
  });

  it("refuses a cursor issued for a different read", async () => {
    const filtered = await run<PackPage>("list", { limit: 1, kind: "input" });
    const unfiltered = await run<PackPage>("list", { limit: 1 });
    // Spending the unfiltered read's cursor on the filtered one would answer a
    // page of the wrong question, with nothing in the payload to show it.
    await expect(
      recoveryOf(() =>
        run<PackPage>("list", {
          limit: 1,
          kind: "input",
          after: unfiltered.nextAfter,
        }),
      ),
    ).resolves.toMatch(/issued for a different read/);
    expect(filtered.nextAfter).toBeUndefined();
  });

  it("refuses a limit that is not a whole number of rows", async () => {
    await expect(
      recoveryOf(() => run<PackPage>("list", { limit: 0 })),
    ).resolves.toMatch(new RegExp(`1 to ${MAX_LIST_WINDOW}`));
  });

  it("refuses a limit above the ceiling, naming it", async () => {
    // `--limit 9007199254740991` is the natural "give me everything" an agent
    // writes, and it used to reach the store's own `LIMIT` — which must fit a
    // 32-bit integer — and come back as a parse error dressed as
    // INTERNAL_ERROR with "report this issue". A typed refusal that says what
    // it would accept is the answer to a legitimate question asked too big.
    for (const limit of [MAX_LIST_WINDOW + 1, 2 ** 32 - 1, 1e21, 2 ** 53 - 1]) {
      await expect(
        recoveryOf(() => run<PackPage>("list", { limit })),
      ).resolves.toMatch(new RegExp(`1 to ${MAX_LIST_WINDOW}`));
    }
    // The ceiling itself is admitted: a refusal one row early would be a
    // different bug.
    await expect(
      run<PackPage>("list", { limit: MAX_LIST_WINDOW }),
    ).resolves.toBeDefined();
  });

  it("refuses a cursor whose offset is above the ceiling", async () => {
    // The fingerprint covers the query and the arguments, not the offset — so
    // a real cursor with only `o` edited is fingerprint-valid, and that is the
    // path by which an unbounded offset reached the query's own `OFFSET`.
    const fingerprint = pageFingerprint([
      WIDGET_PACK.list?.query ?? "",
      "[]",
      "null",
    ]);
    await expect(
      recoveryOf(() =>
        run<PackPage>("list", {
          limit: 1,
          after: encodeCursor(2 ** 53 - 1, fingerprint),
        }),
      ),
    ).resolves.toMatch(/cursor from a previous page/);
    // An offset the kernel can serve is still served, empty page and all.
    const edge = await run<PackPage>("list", {
      limit: 1,
      after: encodeCursor(MAX_LIST_WINDOW, fingerprint),
    });
    expect(edge.rows).toEqual([]);
  });

  it("looks up an entity by name with its fields and expands (detailed)", async () => {
    const output = await run<LookupOutput>("lookup", { name: ["Button"] });
    expect(output.errors).toEqual([]);
    const entity = output.results.at(0);
    expect(entity?.name).toBe("Button");
    expect(entity?.description).toBe("A button.");
    expect(entity?.parts).toEqual([{ name: "Label" }]);
  });

  it("resolves a name case-insensitively and reports misses with suggestions", async () => {
    const hit = await run<LookupOutput>("lookup", { name: ["bUTTON"] });
    expect(hit.results.at(0)?.name).toBe("Button");
    await expect(
      run<LookupOutput>("lookup", { name: ["Buton"] }),
    ).rejects.toThrow(/not found/i);
  });

  it("samples N full exemplars with the population size", async () => {
    const data = await run<{ samples: PackRow[]; totalCount: number }>(
      "sample",
      { count: "2" },
    );
    expect(data.samples).toHaveLength(2);
    expect(data.totalCount).toBe(2);
  });
});

/**
 * The listing a story contributes to the MCP resource surface is DERIVED from
 * the types its lookup already names — the story author writes the type set
 * once, for the name resolve, and the resource listing reads that same
 * declaration. Nothing to keep in sync because there is nothing written twice.
 */
describe("declared listing (derived from the lookup's types)", () => {
  it("derives one collection per declared type, unweighted types at 1", () => {
    expect(
      compileListable({
        noun: "gadget",
        lookup: { by: "ex:name", types: ["ex:Widget", "ex:Part"] },
      }),
    ).toEqual({
      sources: [
        { type: "ex:Widget", as: "collection", weight: 1 },
        { type: "ex:Part", as: "collection", weight: 1 },
      ],
    });
  });

  it("carries a declared weight onto the type it names", () => {
    const listable = compileListable({
      noun: "gadget",
      lookup: {
        by: "ex:name",
        types: ["ex:Widget", "ex:Part"],
        weights: { "ex:Part": 0.6 },
      },
    });
    expect(listable?.sources.map((s) => s.weight)).toEqual([1, 0.6]);
  });

  it("declares nothing for a list-only noun (it addresses no class)", () => {
    expect(
      compileListable({ noun: "gadget", list: { query: "", columns: [] } }),
    ).toBeUndefined();
  });

  it("carries the listing onto the compiled module, beside its verbs", () => {
    const module = compileStoryModule(
      { noun: "gadget", lookup: { by: "ex:name", type: "ex:Widget" } },
      distributionSource("t"),
      PREFIXES,
    );
    expect(module.story).toBe(true);
    expect(module.mcpListable?.sources).toEqual([
      { type: "ex:Widget", as: "collection", weight: 1 },
    ]);
  });
});

describe("weights validation (a weight that can never apply is rejected)", () => {
  it("accepts a weight naming a type the lookup addresses", () => {
    const definition = {
      noun: "gadget",
      lookup: {
        by: "ex:name",
        types: ["ex:Widget", "ex:Part"],
        weights: { "ex:Part": 0.6 },
      },
    };
    expect(parsePackDefinition(definition, "t")).toEqual(definition);
  });

  it("REJECTS a weight naming a type the lookup does not address", () => {
    // A silent no-op is how a weight that never applied survives review: the
    // type gets renamed, the weight stays pointed at the old name, and nothing
    // says so — the ranking simply stops changing.
    expect(() =>
      parsePackDefinition(
        {
          noun: "gadget",
          lookup: {
            by: "ex:name",
            types: ["ex:Widget"],
            weights: { "ex:Gone": 0.6 },
          },
        },
        "t",
      ),
    ).toThrow(/ex:Gone/);
  });

  it("REJECTS a weight outside 0–1", () => {
    expect(() =>
      parsePackDefinition(
        {
          noun: "gadget",
          lookup: {
            by: "ex:name",
            type: "ex:Widget",
            weights: { "ex:Widget": 2 },
          },
        },
        "t",
      ),
    ).toThrow();
  });
});

describe("nameFallback validation (a derived name needs a class to vouch for it)", () => {
  it("accepts the fallback beside a class constraint", () => {
    const definition = {
      noun: "gadget",
      lookup: { by: "ex:name", nameFallback: "iri", type: "ex:Widget" },
    };
    expect(parsePackDefinition(definition, "t")).toEqual(definition);
  });

  it("REJECTS the fallback with no class constraint", () => {
    // Without one there is no triple bounding `?uri`, so the derived-name
    // population would be scanned over the whole graph — and a derived name is
    // only as trustworthy as the class vouching for the entity it came from.
    expect(() =>
      parsePackDefinition(
        { noun: "gadget", lookup: { by: "ex:name", nameFallback: "iri" } },
        "t",
      ),
    ).toThrow(/nameFallback/);
  });
});

describe("filter vocabulary validation (where a value-free filter's values live)", () => {
  const listShape = {
    query: "SELECT ?uri ?kind WHERE { ?uri a ex:Widget ; ex:kind ?kind }",
    columns: [{ field: "uri" }],
  };

  it("accepts a vocabulary SELECT on a value-free filter", () => {
    const definition = {
      noun: "widget",
      list: {
        ...listShape,
        filters: [
          {
            param: "kind",
            variable: "kind",
            vocabulary: { query: "SELECT ?kind WHERE { ?k a ex:Kind }" },
          },
        ],
      },
    };
    expect(parsePackDefinition(definition, "t")).toEqual(definition);
  });

  it("REJECTS a vocabulary beside a declared `values` set", () => {
    // A declared set IS the vocabulary — the filter projects it as an enum and
    // canonicalizes against it. A second, graph-read one alongside is a silent
    // no-op at best and a disagreement at worst.
    expect(() =>
      parsePackDefinition(
        {
          noun: "widget",
          list: {
            ...listShape,
            filters: [
              {
                param: "kind",
                variable: "kind",
                values: ["a", "b"],
                vocabulary: { query: "SELECT ?kind WHERE { ?k a ex:Kind }" },
              },
            ],
          },
        },
        "t",
      ),
    ).toThrow(/mutually exclusive/);
  });

  it("REJECTS a vocabulary query that is not a SELECT", () => {
    expect(() =>
      parsePackDefinition(
        {
          noun: "widget",
          list: {
            ...listShape,
            filters: [
              {
                param: "kind",
                variable: "kind",
                vocabulary: { query: "ASK { ?k a ex:Kind }" },
              },
            ],
          },
        },
        "t",
      ),
    ).toThrow(/SELECT/);
  });
});

describe("compileListable — absolute IRIs reach the prefixed contract", () => {
  it("compacts an absolute lookup type, and its weight key with it", () => {
    // `PackLookup.type`/`types` accept a prefixed name OR an absolute IRI, but
    // the listing is keyed on the index's prefixed types. Verbatim, such a story
    // compiled clean and then matched no class and no weight.
    const listable = compileListable({
      noun: "widget",
      lookup: {
        by: "ds:name",
        types: ["https://ds.canonical.com/Component", "ds:Pattern"],
        weights: { "https://ds.canonical.com/Component": 0.4 },
      },
    } as PackDefinition);

    expect(listable?.sources.map((s) => s.type)).toEqual([
      "ds:Component",
      "ds:Pattern",
    ]);
    // The weight followed its type through the same compaction, so it still
    // applies — keying it on the raw IRI would have silently dropped it.
    const component = listable?.sources.find((s) => s.type === "ds:Component");
    expect(component?.weight).toBe(0.4);
    expect(listable?.sources.find((s) => s.type === "ds:Pattern")?.weight).toBe(
      1,
    );
  });
});
