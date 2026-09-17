/**
 * A filter that names a noun accepts what that noun's lookup accepts, and a
 * `many` expand field adds values to a row, never rows.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { ConfigLayers } from "../config/index.js";
import type { PragmaRuntime } from "../runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { assembleEffectiveModules } from "./collect.js";
import { compilePack, compileStoryModule } from "./compile.js";
import type { LookupOutput } from "./resolveEntity.js";
import { parsePackDefinition } from "./schema.js";
import {
  distributionSource,
  type PackDefinition,
  type PackPage,
} from "./types.js";
import { verbKey } from "./uniqueness.js";

const PREFIXES = {
  ex: "https://example.org/shop#",
  owl: "http://www.w3.org/2002/07/owl#",
};

const TTL = `
@prefix ex: <https://example.org/shop#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

ex:Maker a owl:Class .
ex:Widget a owl:Class .

ex:acme a ex:Maker ; ex:name "Acme" ; ex:code "A1" .
ex:acme2 a ex:Maker ; ex:name "Acme" .
ex:bolt a ex:Maker ; ex:name "Bolt" .
ex:idle a ex:Maker ; ex:name "Idle" .

ex:button a ex:Widget ; ex:name "Button" ; ex:madeBy ex:acme ;
  ex:alias "btn" , "Btn" , "push-button" .
ex:label a ex:Widget ; ex:name "Label" ; ex:madeBy ex:acme2 .
ex:slider a ex:Widget ; ex:name "Slider" ; ex:madeBy ex:bolt .

ex:bolt ex:part
  [ ex:group "g" ; ex:label "f" ; ex:tag "x" , "y" ] ,
  [ ex:group "g" ; ex:label "c" ; ex:tag "x" ] ,
  [ ex:group "g" ; ex:label "e" ] ,
  [ ex:group "g" ; ex:label "a" ; ex:tag "y" ] ,
  [ ex:group "g" ; ex:label "d" ; ex:tag "x" ] ,
  [ ex:group "g" ; ex:label "b" ] .
`;

const MAKER: PackDefinition = {
  noun: "maker",
  lookup: {
    by: "ex:name",
    type: "ex:Maker",
    expand: [
      {
        name: "widgets",
        kind: "table",
        relation: "^ex:madeBy",
        select: [
          { name: "name", property: "ex:name", noun: "widget" },
          { name: "aliases", property: "ex:alias", many: true },
        ],
      },
      {
        name: "parts",
        kind: "table",
        relation: "ex:part",
        // Every part ties on the one declared key.
        orderBy: ["group"],
        select: [
          { name: "group", property: "ex:group" },
          { name: "label", property: "ex:label" },
          { name: "tags", property: "ex:tag", many: true },
        ],
      },
    ],
  },
};

const WIDGET: PackDefinition = {
  noun: "widget",
  list: {
    query: [
      "SELECT ?uri ?name ?maker ?makerUri WHERE {",
      "  ?uri a ex:Widget ; ex:name ?name ; ex:madeBy ?makerUri .",
      "  ?makerUri ex:name ?maker .",
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "name", label: "Name" },
      { field: "maker", label: "Maker", noun: "maker" },
    ],
    filters: [
      { param: "maker", variable: "maker", noun: "maker", entity: "makerUri" },
    ],
  },
  lookup: { by: "ex:name", type: "ex:Widget" },
};

const STORIES = new Map([MAKER, WIDGET].map((story) => [story.noun, story]));

const verb = (story: PackDefinition, name: string): VerbSpec =>
  compilePack(
    story,
    distributionSource("test:links"),
    PREFIXES,
    (noun) => STORIES.get(noun)?.lookup,
  ).find((v) => verbKey(v.path) === `${story.noun} ${name}`) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});

const widgetsBy = async (maker: unknown): Promise<PackPage["rows"]> =>
  ((await verb(WIDGET, "list").run({ maker }, rt)) as PackPage).rows;

describe("a filter that names a noun", () => {
  it("takes a name, and a shared name means every entity it reaches", async () => {
    const rows = await widgetsBy("acme");
    expect(rows.map((row) => row.name)).toEqual(["Button", "Label"]);
  });

  it("takes a prefixed IRI and an absolute IRI, which reach one entity", async () => {
    expect((await widgetsBy("ex:acme2")).map((row) => row.name)).toEqual([
      "Label",
    ]);
    expect(
      (await widgetsBy("https://example.org/shop#bolt")).map((row) => row.name),
    ).toEqual(["Slider"]);
  });

  it("takes several values as a union", async () => {
    const rows = await widgetsBy(["Bolt", "ex:acme"]);
    expect(rows.map((row) => row.name)).toEqual(["Button", "Slider"]);
  });

  it("leaves the entity variable out of the rows", async () => {
    expect(Object.keys((await widgetsBy("Bolt"))[0] ?? {})).toEqual([
      "uri",
      "name",
      "maker",
    ]);
  });

  it("answers a calm empty list for an entity that exists and no row names", async () => {
    expect(await widgetsBy("Idle")).toEqual([]);
  });

  it("refuses a value the noun's lookup cannot resolve, offering what a lookup miss offers", async () => {
    await expect(widgetsBy(["Bolt", "Bolts"])).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: 'No maker is named "Bolts".',
      suggestions: ["Bolt"],
    });
  });

  it("is a configuration error when no story declares the noun", async () => {
    const orphan = compilePack(
      WIDGET,
      distributionSource("test:links"),
      PREFIXES,
    )[0] as VerbSpec;
    await expect(orphan.run({ maker: "Acme" }, rt)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });
});

describe("a noun filter across the shipped and the project's stories", () => {
  const shipped = (...stories: PackDefinition[]): CapabilityModule[] =>
    stories.map((story) =>
      compileStoryModule(
        story,
        distributionSource("test:shipped"),
        PREFIXES,
        (noun) => STORIES.get(noun)?.lookup,
      ),
    );
  const project = (stories: unknown[]): ConfigLayers =>
    ({
      config: { stories, prefixes: PREFIXES },
      origins: { packs: "default", stories: "project" },
    }) as unknown as ConfigLayers;
  const makerFilter = (modules: readonly CapabilityModule[], maker: string) =>
    (
      modules
        .flatMap((module) => module.verbs)
        .find((v) => verbKey(v.path) === "widget list") as VerbSpec
    ).run({ maker: [maker] }, rt) as Promise<PackPage>;

  it("a project story resolves its filter through a shipped noun", async () => {
    const modules = assembleEffectiveModules(shipped(MAKER), project([WIDGET]));
    const page = await makerFilter(modules, "Bolt");
    expect(page.rows.map((row) => row.name)).toEqual(["Slider"]);
  });

  it("a shipped filter resolves through the project's override of the noun it names", async () => {
    const byCode = {
      noun: "maker",
      lookup: { by: "ex:code", type: "ex:Maker" },
    };
    const modules = assembleEffectiveModules(
      shipped(MAKER, WIDGET),
      project([byCode]),
    );
    const page = await makerFilter(modules, "A1");
    expect(page.rows.map((row) => row.name)).toEqual(["Button"]);
    await expect(makerFilter(modules, "Acme")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("refuses a story naming a noun nothing looks up, where it is assembled", () => {
    expect(() => assembleEffectiveModules([], project([WIDGET]))).toThrow(
      /"widget" names the noun "maker"/,
    );
  });
});

describe("a many expand field", () => {
  it("is one cell per child holding every value, sorted", async () => {
    const output = (await verb(MAKER, "lookup").run(
      { name: ["ex:acme"] },
      rt,
    )) as LookupOutput;
    const widgets = output.results[0]?.widgets as { aliases?: string }[];
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.aliases).toBe("Btn btn push-button");
  });
});

describe("a grouped expand", () => {
  it("orders rows that tie on orderBy the same way on every store", async () => {
    const labels: string[] = [];
    for (let boot = 0; boot < 3; boot += 1) {
      const fresh = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES });
      const output = (await verb(MAKER, "lookup").run(
        { name: ["Bolt"] },
        fresh.rt,
      )) as LookupOutput;
      const parts = output.results[0]?.parts as { label: string }[];
      labels.push(parts.map((part) => part.label).join(""));
    }
    expect(labels).toEqual(["abcdef", "abcdef", "abcdef"]);
  });
});

describe("the grammar", () => {
  const withFilter = (filter: Record<string, unknown>): unknown => ({
    ...WIDGET,
    list: { ...WIDGET.list, filters: [filter] },
  });

  it("accepts both stories as declared", () => {
    expect(() => parsePackDefinition(MAKER, "test")).not.toThrow();
    expect(() => parsePackDefinition(WIDGET, "test")).not.toThrow();
  });

  it.each([
    [
      "a noun filter with no entity",
      { param: "maker", variable: "maker", noun: "maker" },
      /must declare the "entity"/,
    ],
    [
      "a noun filter with a vocabulary of its own",
      {
        param: "maker",
        variable: "maker",
        noun: "maker",
        entity: "makerUri",
        values: ["Acme"],
      },
      /mutually exclusive/,
    ],
    [
      "an entity the query does not project",
      { param: "maker", variable: "maker", noun: "maker", entity: "absent" },
      /"absent" is filtered or searched but not projected/,
    ],
    [
      "an entity without a noun",
      {
        param: "maker",
        variable: "maker",
        values: ["Acme"],
        entity: "makerUri",
      },
      /belong to a filter that names a "noun"/,
    ],
  ])("refuses %s", (_, filter, reason) => {
    expect(() => parsePackDefinition(withFilter(filter), "test")).toThrow(
      reason,
    );
  });

  it.each([
    [
      "many with blankWhenSelf",
      { many: true, blankWhenSelf: true },
      {},
      /mutually exclusive/,
    ],
    [
      "many on the GraphQL lane",
      { many: true },
      { source: "graphql" },
      /sets "many", which only the SPARQL lane/,
    ],
    [
      "ordering by a many field",
      { many: true },
      { orderBy: ["aliases"] },
      /a "many" field/,
    ],
  ])("refuses %s", (_, field, expand, reason) => {
    const lookup = MAKER.lookup as NonNullable<PackDefinition["lookup"]>;
    const story = {
      ...MAKER,
      lookup: {
        ...lookup,
        ...("source" in expand ? { source: "graphql" } : {}),
        expand: [
          {
            ...lookup.expand?.[0],
            ...("orderBy" in expand ? expand : {}),
            select: [{ name: "aliases", property: "ex:alias", ...field }],
          },
        ],
      },
    };
    expect(() => parsePackDefinition(story, "test")).toThrow(reason);
  });
});
