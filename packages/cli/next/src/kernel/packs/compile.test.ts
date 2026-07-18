/**
 * Compiler invariants (PROTECTED) — the single pack compiler.
 *
 * Closes fork F3: one grammar, one compiler. Asserts the round-trip
 * (validate∘serialize is identity), the projected verb shapes and
 * `(noun, verb)` uniqueness (storeless), and the SPARQL fetch path end to end
 * against a fixture store (list filter/search, lookup by name, sample).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { compilePack } from "./compile.js";
import type { LookupOutput } from "./resolveEntity.js";
import { parsePackDefinition } from "./schema.js";
import type { PackDefinition, PackRow } from "./types.js";
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

  it("projects list, lookup, and sample verbs with unique keys", () => {
    const verbs = compilePack(WIDGET_PACK, "bundled:widget", PREFIXES);
    expect(verbs.map((v) => verbKey(v.path))).toEqual([
      "widget list",
      "widget lookup",
      "widget sample",
    ]);
    expect(() => assertUniqueVerbs(verbs)).not.toThrow();
  });

  it("projects list filters as params (enum) + a search flag", () => {
    const [list] = compilePack(WIDGET_PACK, "bundled:widget", PREFIXES);
    expect(list?.params.map((p) => p.name)).toEqual(["kind", "search"]);
    const kind = list?.params.find((p) => p.name === "kind");
    expect(kind?.kind).toBe("enum");
    expect(list?.capability.needsStore).toBe(true);
    expect(list?.capability.mcp.expose).toBe(true);
  });

  it("projects the lookup as a variadic name-completing positional + disclosure", () => {
    const verbs = compilePack(WIDGET_PACK, "bundled:widget", PREFIXES);
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
      compilePack(def, "bundled:widget", PREFIXES)
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

  const run = <R>(verbLabel: string, params: Record<string, unknown>) => {
    const verb = compilePack(WIDGET_PACK, "bundled:widget", PREFIXES).find(
      (v) => verbKey(v.path) === `widget ${verbLabel}`,
    );
    if (!verb) throw new Error(`no widget ${verbLabel}`);
    return verb.run(params, rt) as Promise<R>;
  };

  it("lists rows in the uniform pack shape", async () => {
    const rows = await run<PackRow[]>("list", {});
    expect(rows.map((r) => r.name)).toEqual(["Button", "Label"]);
    expect(rows[0]?.uri).toBe("https://example.org/widgets#button");
  });

  it("filters by an enum value (post-query row predicate)", async () => {
    const rows = await run<PackRow[]>("list", { kind: "input" });
    expect(rows.map((r) => r.name)).toEqual(["Button"]);
  });

  it("searches case-insensitively", async () => {
    const rows = await run<PackRow[]>("list", { search: "lab" });
    expect(rows.map((r) => r.name)).toEqual(["Label"]);
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
