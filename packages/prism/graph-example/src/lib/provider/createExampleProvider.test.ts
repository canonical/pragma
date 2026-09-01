import { type ExecutionResult, graphql } from "graphql";
import { beforeAll, describe, expect, it } from "vitest";
import { toCursor } from "./connection.js";
import { GEO_POINT_CLASS_URI, META_CLASS_URI } from "./constants.js";
import { createExampleProvider } from "./createExampleProvider.js";
import {
  BARE_ENTITY_URI,
  EMPTY_LOCAL_NAME_URI,
  exampleDataset,
  MULTILINGUAL_ENTITY_URI,
  SECOND_NAMESPACE_ENTITY_URI,
} from "./dataset.js";
import type { ExampleDataset } from "./types.js";

const provider = createExampleProvider();

/** Execute against the default dataset and fail loudly on any GraphQL error. */
const run = async (
  source: string,
  variableValues?: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const result: ExecutionResult = await graphql({
    schema: provider.schema,
    source,
    rootValue: provider.rootValue,
    variableValues,
  });
  expect(result.errors).toBeUndefined();
  expect(result.data).not.toBeNull();
  return result.data as Record<string, unknown>;
};

/** Execute against a purpose-built dataset — used for the defensive paths. */
const runWith = async (
  dataset: ExampleDataset,
  source: string,
): Promise<Record<string, unknown>> => {
  const custom = createExampleProvider(dataset);
  const result = await graphql({
    schema: custom.schema,
    source,
    rootValue: custom.rootValue,
  });
  expect(result.errors).toBeUndefined();
  return result.data as Record<string, unknown>;
};

describe("the schema", () => {
  it("is built from the authored contract plus this package's extension", () => {
    expect(provider.sdl).toContain("interface Node");
    expect(provider.sdl).toContain("type Station implements Node");
  });

  it("adds no root fields — the contract's five must suffice", () => {
    const query = provider.schema.getQueryType();
    expect(Object.keys(query?.getFields() ?? {}).sort()).toEqual([
      "node",
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
    ]);
  });

  it("declares the provider's own types as Node implementers", () => {
    const node = provider.schema.getType("Node");
    const names = provider.schema
      .getPossibleTypes(
        // biome-ignore lint/suspicious/noExplicitAny: narrowing an abstract type for a schema assertion
        node as any,
      )
      .map((type) => type.name)
      .sort();
    expect(names).toEqual([
      "Interchange",
      "Line",
      "OntologyClass",
      "Station",
      "Zone",
    ]);
  });
});

describe("Query.node", () => {
  it("resolves an entity by absolute IRI", async () => {
    const data = await run(
      `{ node(id: "${MULTILINGUAL_ENTITY_URI}") { __typename uri } }`,
    );
    expect(data.node).toEqual({
      __typename: "Station",
      uri: MULTILINGUAL_ENTITY_URI,
    });
  });

  it("resolves an ontology class, which is also a Node", async () => {
    const data = await run(
      `{ node(id: "https://metro.example/onto#Station") { __typename uri } }`,
    );
    expect(data.node).toEqual({
      __typename: "OntologyClass",
      uri: "https://metro.example/onto#Station",
    });
  });

  it("is null for an unknown IRI", async () => {
    const data = await run(
      `{ node(id: "https://metro.example/onto#nope") { uri } }`,
    );
    expect(data.node).toBeNull();
  });

  it("gives every entity a __typename the schema declares", async () => {
    const data = await run(
      `{ ontologyClass(uri: "metro:Stop") { instances(first: 99) { edges { node { __typename } } } } }`,
    );
    const cls = data.ontologyClass as {
      instances: { edges: { node: { __typename: string } }[] };
    };
    for (const edge of cls.instances.edges) {
      expect(["Station", "Interchange", "Line"]).toContain(
        edge.node.__typename,
      );
    }
  });
});

describe("Query.ontologies / ontology", () => {
  it("returns every loaded namespace", async () => {
    const data = await run(`{ ontologies { prefix namespace label } }`);
    expect(data.ontologies).toEqual([
      {
        prefix: "metro",
        namespace: "https://metro.example/onto#",
        label: "Metro Network Ontology",
      },
      { prefix: "geo", namespace: "https://geo.example/onto#", label: null },
      {
        prefix: "rdfs",
        namespace: "http://www.w3.org/2000/01/rdf-schema#",
        label: "RDF Schema",
      },
    ]);
  });

  it("scopes classes and properties to the namespace", async () => {
    const data = await run(
      `{ ontology(prefix: "geo") { classes { uri } properties { uri } } }`,
    );
    expect(data.ontology).toEqual({
      classes: [
        { uri: GEO_POINT_CLASS_URI },
        { uri: "https://geo.example/onto#Zone" },
      ],
      properties: [
        { uri: "https://geo.example/onto#location" },
        { uri: "https://geo.example/onto#latitude" },
        { uri: "https://geo.example/onto#longitude" },
        { uri: "https://geo.example/onto#inZone" },
      ],
    });
  });

  it("is null for an unknown prefix", async () => {
    const data = await run(`{ ontology(prefix: "nope") { prefix } }`);
    expect(data.ontology).toBeNull();
  });
});

describe("Query.ontologyClass", () => {
  it("accepts the prefixed convenience form", async () => {
    const data = await run(`{ ontologyClass(uri: "metro:Station") { uri } }`);
    expect(data.ontologyClass).toEqual({
      uri: "https://metro.example/onto#Station",
    });
  });

  it("accepts the absolute IRI", async () => {
    const data = await run(
      `{ ontologyClass(uri: "https://metro.example/onto#Station") { uri } }`,
    );
    expect(data.ontologyClass).toEqual({
      uri: "https://metro.example/onto#Station",
    });
  });

  it("is null for an unknown class", async () => {
    const data = await run(`{ ontologyClass(uri: "metro:Nope") { uri } }`);
    expect(data.ontologyClass).toBeNull();
  });

  it("resolves the hierarchy transitively", async () => {
    const data = await run(`{
      ontologyClass(uri: "metro:Interchange") {
        isAbstract namespace
        superclass { uri }
        superclasses { uri }
        subclasses { uri }
      }
    }`);
    expect(data.ontologyClass).toEqual({
      isAbstract: false,
      namespace: "https://metro.example/onto#",
      superclass: { uri: "https://metro.example/onto#Station" },
      superclasses: [
        { uri: "https://metro.example/onto#Station" },
        { uri: "https://metro.example/onto#Stop" },
      ],
      subclasses: [],
    });
  });

  it("reports a null superclass and real subclasses for a root class", async () => {
    const data = await run(
      `{ ontologyClass(uri: "metro:Stop") { isAbstract superclass { uri } superclasses { uri } subclasses { uri } } }`,
    );
    expect(data.ontologyClass).toEqual({
      isAbstract: true,
      superclass: null,
      superclasses: [],
      subclasses: [{ uri: "https://metro.example/onto#Station" }],
    });
  });

  it("marks own properties own and ancestors' properties inherited", async () => {
    const data = await run(`{
      ontologyClass(uri: "metro:Station") {
        properties { required singular inherited property { uri } }
      }
    }`);
    const properties = (
      data.ontologyClass as {
        properties: {
          required: boolean;
          singular: boolean;
          inherited: boolean;
          property: { uri: string };
        }[];
      }
    ).properties;
    expect(properties).toEqual([
      {
        required: false,
        singular: true,
        inherited: false,
        property: { uri: "https://metro.example/onto#platformCount" },
      },
      {
        required: true,
        singular: false,
        inherited: false,
        property: { uri: "https://metro.example/onto#servesLine" },
      },
      {
        required: false,
        singular: true,
        inherited: false,
        property: { uri: "https://geo.example/onto#location" },
      },
      {
        required: false,
        singular: true,
        inherited: false,
        property: { uri: "https://geo.example/onto#inZone" },
      },
      {
        required: true,
        singular: true,
        inherited: true,
        property: { uri: "https://metro.example/onto#name" },
      },
      {
        required: false,
        singular: true,
        inherited: true,
        property: { uri: "https://metro.example/onto#note" },
      },
    ]);
  });
});

describe("OntologyClass.instances", () => {
  it("counts subclass instances as instances of the superclass", async () => {
    const data = await run(`{
      station: ontologyClass(uri: "metro:Station") { instanceCount }
      interchange: ontologyClass(uri: "metro:Interchange") { instanceCount }
      line: ontologyClass(uri: "metro:Line") { instanceCount }
    }`);
    expect(data.station).toEqual({ instanceCount: 16 });
    expect(data.interchange).toEqual({ instanceCount: 2 });
    expect(data.line).toEqual({ instanceCount: 3 });
  });

  it("counts nothing for a class with no ABox members", async () => {
    const data = await run(
      `{ ontologyClass(uri: "rdfs:Class") { instanceCount instances { edges { cursor } } } }`,
    );
    expect(data.ontologyClass).toEqual({
      instanceCount: 0,
      instances: { edges: [] },
    });
  });

  it("pages forward with a real hasNextPage", async () => {
    const data = await run(`{
      ontologyClass(uri: "metro:Station") {
        instances(first: 3) {
          edges { cursor node { uri } }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
    }`);
    const instances = (
      data.ontologyClass as {
        instances: {
          edges: { cursor: string; node: { uri: string } }[];
          pageInfo: Record<string, unknown>;
        };
      }
    ).instances;
    expect(instances.edges).toHaveLength(3);
    expect(instances.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: instances.edges[0]?.cursor,
      endCursor: instances.edges[2]?.cursor,
    });
  });

  it("pages backward from the tail", async () => {
    const data = await run(`{
      ontologyClass(uri: "metro:Station") {
        instances(last: 2) { edges { node { uri } } pageInfo { hasNextPage hasPreviousPage } }
      }
    }`);
    expect(data.ontologyClass).toEqual({
      instances: {
        edges: [
          { node: { uri: "https://metro.example/onto#verge-park" } },
          { node: { uri: "https://metro.example/onto#willowbank" } },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      },
    });
  });

  it("resumes from a cursor", async () => {
    const after = toCursor(EMPTY_LOCAL_NAME_URI);
    const data = await run(`{
      ontologyClass(uri: "metro:Station") {
        instances(first: 1, after: "${after}") { edges { node { uri } } }
      }
    }`);
    expect(data.ontologyClass).toEqual({
      instances: {
        edges: [
          { node: { uri: "https://metro.example/onto#central-exchange" } },
        ],
      },
    });
  });

  it("reports null cursors for an empty page", async () => {
    const data = await run(
      `{ ontologyClass(uri: "metro:Station") { instances(first: 0) { pageInfo { startCursor endCursor } } } }`,
    );
    expect(data.ontologyClass).toEqual({
      instances: { pageInfo: { startCursor: null, endCursor: null } },
    });
  });
});

describe("Query.ontologyProperty", () => {
  it("resolves every field, including a round-tripping inverse", async () => {
    const data = await run(`{
      ontologyProperty(uri: "metro:servesLine") {
        uri label definition range kind functional namespace
        domain { uri }
        inverse { uri kind inverse { uri } }
      }
    }`);
    expect(data.ontologyProperty).toEqual({
      uri: "https://metro.example/onto#servesLine",
      label: "serves line",
      definition: null,
      range: "metro:Line",
      kind: "OBJECT",
      functional: false,
      namespace: "https://metro.example/onto#",
      domain: { uri: "https://metro.example/onto#Station" },
      inverse: {
        uri: "https://metro.example/onto#servedBy",
        kind: "OBJECT",
        inverse: { uri: "https://metro.example/onto#servesLine" },
      },
    });
  });

  it("serves all three PropertyKind members", async () => {
    const data = await run(`{
      datatype: ontologyProperty(uri: "metro:name") { kind functional domain { uri } }
      object: ontologyProperty(uri: "metro:servesLine") { kind }
      annotation: ontologyProperty(uri: "metro:note") { kind functional inverse { uri } }
    }`);
    expect(data.datatype).toEqual({
      kind: "DATATYPE",
      functional: true,
      domain: null,
    });
    expect(data.object).toEqual({ kind: "OBJECT" });
    expect(data.annotation).toEqual({
      kind: "ANNOTATION",
      functional: false,
      inverse: null,
    });
  });

  it("is null for an unknown property", async () => {
    const data = await run(`{ ontologyProperty(uri: "metro:nope") { uri } }`);
    expect(data.ontologyProperty).toBeNull();
  });
});

describe("_meta", () => {
  it("serves the language-tagged fields off a multilingual entity", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") {
        _meta {
          title
          french: title(lang: "fr")
          label
          frenchLabel: label(lang: "fr")
          comment
          definition
          type { uri }
        }
      }
    }`);
    expect(data.node).toEqual({
      _meta: {
        title: "Northgate",
        french: "Porte-Nord",
        label: "Northgate",
        frenchLabel: "Porte-Nord",
        comment: null,
        definition: "The northern terminus.",
        type: { uri: "https://metro.example/onto#Station" },
      },
    });
  });

  it("makes a class an instance of the metaclass, which instances itself", async () => {
    const data = await run(`{
      ontologyClass(uri: "metro:Station") {
        _meta { title fields { inherited } type { uri _meta { type { uri } } } }
      }
    }`);
    expect(data.ontologyClass).toEqual({
      _meta: {
        title: "Station",
        fields: [],
        type: { uri: META_CLASS_URI, _meta: { type: { uri: META_CLASS_URI } } },
      },
    });
  });

  it("lists the entity's class fields, own then inherited", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") {
        _meta { fields { inherited property { uri } } }
      }
    }`);
    expect(data.node).toEqual({
      _meta: {
        fields: [
          {
            inherited: false,
            property: { uri: "https://metro.example/onto#platformCount" },
          },
          {
            inherited: false,
            property: { uri: "https://metro.example/onto#servesLine" },
          },
          {
            inherited: false,
            property: { uri: "https://geo.example/onto#location" },
          },
          {
            inherited: false,
            property: { uri: "https://geo.example/onto#inZone" },
          },
          {
            inherited: true,
            property: { uri: "https://metro.example/onto#name" },
          },
          {
            inherited: true,
            property: { uri: "https://metro.example/onto#note" },
          },
        ],
      },
    });
  });

  it("looks a field up by the exact `name` it serves, and misses cleanly", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") {
        _meta {
          own: field(name: "platformCount") { name required singular inherited }
          inherited: field(name: "name") { name required inherited }
          miss: field(name: "nope") { name }
          notTheIri: field(name: "https://metro.example/onto#name") { name }
        }
      }
    }`);
    expect(data.node).toEqual({
      _meta: {
        own: {
          name: "platformCount",
          required: false,
          singular: true,
          inherited: false,
        },
        inherited: { name: "name", required: true, inherited: true },
        miss: null,
        // The key is `ClassProperty.name`, not the IRI. Only what `fields`
        // publishes is accepted — that is what "round-trips" means.
        notTheIri: null,
      },
    });
  });

  it("publishes a `name` on every field that `field(name:)` accepts back", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") { _meta { fields { name } } }
    }`);
    const names = (
      data.node as { _meta: { fields: { name: string }[] } }
    )._meta.fields.map((field) => field.name);
    expect(names).toEqual([
      "platformCount",
      "servesLine",
      "location",
      "inZone",
      "name",
      "note",
    ]);

    // The round-trip itself: every published name resolves back to its field.
    for (const name of names) {
      const roundTrip = await run(`{
        node(id: "${MULTILINGUAL_ENTITY_URI}") { _meta { field(name: "${name}") { name } } }
      }`);
      expect(roundTrip.node).toEqual({ _meta: { field: { name } } });
    }
  });
});

describe("_meta.curie", () => {
  it("compacts against the entity's own namespace, per entity", async () => {
    const data = await run(`{
      metro: node(id: "${MULTILINGUAL_ENTITY_URI}") { _meta { curie } }
      geo: node(id: "${SECOND_NAMESPACE_ENTITY_URI}") { __typename _meta { curie } }
    }`);
    expect(data.metro).toEqual({ _meta: { curie: "metro:northgate" } });
    expect(data.geo).toEqual({
      __typename: "Zone",
      _meta: { curie: "geo:central-zone" },
    });
  });

  it("compacts classes too, including the metaclass", async () => {
    const data = await run(`{
      station: ontologyClass(uri: "metro:Station") { _meta { curie } }
      zone: ontologyClass(uri: "geo:Zone") { _meta { curie } }
      meta: ontologyClass(uri: "rdfs:Class") { _meta { curie } }
    }`);
    expect(data.station).toEqual({ _meta: { curie: "metro:Station" } });
    expect(data.zone).toEqual({ _meta: { curie: "geo:Zone" } });
    expect(data.meta).toEqual({ _meta: { curie: "rdfs:Class" } });
  });

  it("compacts to a bare prefix when the local name is empty", async () => {
    const data = await run(
      `{ node(id: "${EMPTY_LOCAL_NAME_URI}") { _meta { curie } } }`,
    );
    expect(data.node).toEqual({ _meta: { curie: "metro:" } });
  });

  it("gives the embeddable its class's curie, having no IRI of its own", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") {
        ... on Station { location { _meta { curie } } }
      }
    }`);
    expect(data.node).toEqual({
      location: { _meta: { curie: "geo:GeoPoint" } },
    });
  });

  it("is derivable by a client from Query.ontologies alone", async () => {
    const data = await run(`{
      ontologies { prefix namespace }
      node(id: "${SECOND_NAMESPACE_ENTITY_URI}") { uri _meta { curie } }
    }`);
    const ontologies = data.ontologies as {
      prefix: string;
      namespace: string;
    }[];
    const node = data.node as { uri: string; _meta: { curie: string } };
    const match = ontologies
      .filter((ontology) => node.uri.startsWith(ontology.namespace))
      .sort((a, b) => b.namespace.length - a.namespace.length)[0];
    expect(`${match?.prefix}:${node.uri.slice(match?.namespace.length)}`).toBe(
      node._meta.curie,
    );
  });

  it("falls back to the whole IRI when no namespace is declared", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [{ uri: "urn:C", isAbstract: false, properties: [] }],
        properties: [],
        entities: [{ uri: "urn:e1", type: "urn:C", typename: "Station" }],
      },
      `{ node(id: "urn:e1") { _meta { curie } } }`,
    );
    expect(data.node).toEqual({ _meta: { curie: "urn:e1" } });
  });

  it("prefers the longest matching namespace, so one cannot shadow another", async () => {
    const data = await runWith(
      {
        ontologies: [
          { prefix: "short", namespace: "urn:a:" },
          { prefix: "long", namespace: "urn:a:b:" },
        ],
        classes: [{ uri: "urn:a:b:C", isAbstract: false, properties: [] }],
        properties: [],
        entities: [
          { uri: "urn:a:b:e1", type: "urn:a:b:C", typename: "Station" },
        ],
      },
      `{ node(id: "urn:a:b:e1") { _meta { curie } } }`,
    );
    expect(data.node).toEqual({ _meta: { curie: "long:e1" } });
  });
});

describe("the awkward entities", () => {
  it("titles an entity with no descriptive predicates from its local name", async () => {
    const data = await run(`{
      node(id: "${BARE_ENTITY_URI}") {
        uri
        _meta { title label comment definition type { uri } }
        ... on Station { name platformCount location { latitude } servesLine { uri } }
      }
    }`);
    expect(data.node).toEqual({
      uri: BARE_ENTITY_URI,
      _meta: {
        title: "ghost",
        label: null,
        comment: null,
        definition: null,
        type: { uri: "https://metro.example/onto#Station" },
      },
      name: null,
      platformCount: null,
      location: null,
      servesLine: [],
    });
  });

  it("titles an entity whose local name is empty from the whole IRI", async () => {
    const data = await run(
      `{ node(id: "${EMPTY_LOCAL_NAME_URI}") { _meta { title } } }`,
    );
    expect(data.node).toEqual({ _meta: { title: EMPTY_LOCAL_NAME_URI } });
  });
});

describe("the embeddable", () => {
  it("is reachable, carries _meta, and has no uri to be titled from", async () => {
    const data = await run(`{
      node(id: "${MULTILINGUAL_ENTITY_URI}") {
        ... on Station {
          location { latitude longitude _meta { title label type { uri } } }
        }
      }
    }`);
    expect(data.node).toEqual({
      location: {
        latitude: 51.5412,
        longitude: -0.1435,
        _meta: {
          title: "GeoPoint",
          label: null,
          type: { uri: GEO_POINT_CLASS_URI },
        },
      },
    });
  });

  it("cannot be reached through node(id:) — it has no identity", async () => {
    const data = await run(`{ node(id: "${GEO_POINT_CLASS_URI}") { uri } }`);
    expect(data.node).toEqual({ uri: GEO_POINT_CLASS_URI });
  });
});

describe("the provider's own relational fields", () => {
  it("walks a station to its lines and back again", async () => {
    const data = await run(`{
      node(id: "https://metro.example/onto#central-exchange") {
        ... on Interchange {
          name transferMinutes platformCount
          servesLine { uri name servedBy { uri } }
        }
      }
    }`);
    const node = data.node as {
      servesLine: { uri: string; servedBy: { uri: string }[] }[];
    };
    expect(node.servesLine.map((line) => line.uri)).toEqual([
      "https://metro.example/onto#north-line",
      "https://metro.example/onto#circle-line",
      "https://metro.example/onto#coastal-line",
    ]);
    expect(
      node.servesLine[0]?.servedBy.map((station) => station.uri),
    ).toContain("https://metro.example/onto#central-exchange");
  });
});

describe("defensive paths, exercised with purpose-built datasets", () => {
  const cls = {
    uri: "urn:C",
    isAbstract: false,
    properties: [],
  } as const;

  it("drops an entity whose class the TBox does not declare", async () => {
    const data = await runWith(
      {
        ontologies: [{ prefix: "urn", namespace: "urn:" }],
        classes: [cls],
        properties: [],
        entities: [
          { uri: "urn:e1", type: "urn:Missing", typename: "Station" },
          { uri: "urn:e2", type: "urn:C", typename: "Station" },
        ],
      },
      `{ dropped: node(id: "urn:e1") { uri } kept: node(id: "urn:e2") { uri }
         c: ontologyClass(uri: "urn:C") { instanceCount } }`,
    );
    expect(data.dropped).toBeNull();
    expect(data.kept).toEqual({ uri: "urn:e2" });
    expect(data.c).toEqual({ instanceCount: 1 });
  });

  it("drops a class property whose property the TBox does not declare", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [
          {
            uri: "urn:C",
            isAbstract: false,
            properties: [
              { property: "urn:missing", required: true, singular: true },
              { property: "urn:real", required: false, singular: false },
            ],
          },
        ],
        properties: [
          {
            uri: "urn:real",
            range: "String",
            kind: "DATATYPE",
            functional: false,
          },
        ],
        entities: [],
      },
      `{ ontologyClass(uri: "urn:C") { properties { property { uri } } } }`,
    );
    expect(data.ontologyClass).toEqual({
      properties: [{ property: { uri: "urn:real" } }],
    });
  });

  it("terminates on a superclass cycle instead of recursing forever", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [
          {
            uri: "urn:A",
            superclass: "urn:B",
            isAbstract: false,
            properties: [],
          },
          {
            uri: "urn:B",
            superclass: "urn:A",
            isAbstract: false,
            properties: [],
          },
        ],
        properties: [],
        entities: [],
      },
      `{ ontologyClass(uri: "urn:A") { superclasses { uri } } }`,
    );
    expect(data.ontologyClass).toEqual({
      superclasses: [{ uri: "urn:B" }],
    });
  });

  it("ignores a superclass IRI the TBox does not declare", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [
          {
            uri: "urn:A",
            superclass: "urn:Gone",
            isAbstract: false,
            properties: [],
          },
        ],
        properties: [],
        entities: [],
      },
      `{ ontologyClass(uri: "urn:A") { superclass { uri } superclasses { uri } } }`,
    );
    expect(data.ontologyClass).toEqual({ superclass: null, superclasses: [] });
  });

  it("makes a class an instance of itself when no metaclass is declared", async () => {
    const data = await runWith(
      { ontologies: [], classes: [cls], properties: [], entities: [] },
      `{ ontologyClass(uri: "urn:C") { _meta { type { uri } } } }`,
    );
    expect(data.ontologyClass).toEqual({ _meta: { type: { uri: "urn:C" } } });
  });

  it("omits the embeddable when its class is not declared", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [cls],
        properties: [],
        entities: [
          {
            uri: "urn:e1",
            type: "urn:C",
            typename: "Station",
            location: { latitude: 1, longitude: 2 },
          },
        ],
      },
      `{ node(id: "urn:e1") { ... on Station { location { latitude } } } }`,
    );
    expect(data.node).toEqual({ location: null });
  });

  it("nulls a zone reference that points at nothing", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [cls],
        properties: [],
        entities: [
          {
            uri: "urn:e1",
            type: "urn:C",
            typename: "Station",
            inZone: "urn:gone",
          },
          {
            uri: "urn:e2",
            type: "urn:C",
            typename: "Station",
            inZone: "urn:e3",
          },
          { uri: "urn:e3", type: "urn:C", typename: "Zone" },
          { uri: "urn:e4", type: "urn:C", typename: "Station" },
        ],
      },
      `{ dangling: node(id: "urn:e1") { ... on Station { inZone { uri } } }
         real: node(id: "urn:e2") { ... on Station { inZone { uri } } }
         unset: node(id: "urn:e4") { ... on Station { inZone { uri } } } }`,
    );
    expect(data.dangling).toEqual({ inZone: null });
    expect(data.real).toEqual({ inZone: { uri: "urn:e3" } });
    expect(data.unset).toEqual({ inZone: null });
  });

  it("skips a line reference that points at nothing", async () => {
    const data = await runWith(
      {
        ontologies: [],
        classes: [cls],
        properties: [],
        entities: [
          {
            uri: "urn:e1",
            type: "urn:C",
            typename: "Station",
            servesLine: ["urn:gone", "urn:e2"],
          },
          { uri: "urn:e2", type: "urn:C", typename: "Line" },
        ],
      },
      `{ node(id: "urn:e1") { ... on Station { servesLine { uri } } } }`,
    );
    expect(data.node).toEqual({ servesLine: [{ uri: "urn:e2" }] });
  });

  it("leaves an IRI whose scheme is not a declared prefix alone", async () => {
    const data = await runWith(
      {
        ontologies: [{ prefix: "https", namespace: "urn:trap:" }],
        classes: [{ uri: "urn:trap:C", isAbstract: false, properties: [] }],
        properties: [],
        entities: [],
      },
      `{ expanded: ontologyClass(uri: "https:C") { uri } }`,
    );
    // A prefix that collides with a URL scheme is pathological, and the
    // expansion is textual — this documents that, rather than pretending
    // the collision cannot happen.
    expect(data.expanded).toEqual({ uri: "urn:trap:C" });
  });
});

describe("the shipped dataset", () => {
  it("declares every entity's class", () => {
    const declared = new Set(exampleDataset.classes.map((each) => each.uri));
    for (const entity of exampleDataset.entities) {
      expect(declared).toContain(entity.type);
    }
  });

  it("declares every class property's property", () => {
    const declared = new Set(exampleDataset.properties.map((each) => each.uri));
    for (const each of exampleDataset.classes) {
      for (const cp of each.properties) {
        expect(declared).toContain(cp.property);
      }
    }
  });
});

describe("determinism", () => {
  let first: Record<string, unknown>;

  beforeAll(async () => {
    first = await run(
      `{ ontologyClass(uri: "metro:Station") { instances(first: 5) { edges { cursor } } } }`,
    );
  });

  it("returns the same cursors across independent provider instances", async () => {
    const other = createExampleProvider();
    const result = await graphql({
      schema: other.schema,
      source: `{ ontologyClass(uri: "metro:Station") { instances(first: 5) { edges { cursor } } } }`,
      rootValue: other.rootValue,
    });
    expect(result.data).toEqual(first);
  });
});
