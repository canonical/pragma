// =============================================================================
// TBox schema surface: Ontology, OntologyClass, OntologyProperty,
// ClassProperty, EntityMeta lookups and edge cases.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import {
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLANK_NODES_TTL,
  DS_REALISTIC_TTL,
  INHERITANCE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "../../testing/index.js";
import {
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../compiler/index.js";
import {
  type ClassNode,
  type CompilerContext,
  GRAPHQL,
  type MappedIR,
  type NamespaceInfo,
  type OntologyIR,
  type PropertyNode,
  type RawExtraction,
  RDFS_LABEL,
} from "../shared/index.js";
import buildTBoxSchema from "./buildTBoxSchema.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

interface Compiled {
  result: CompilerResult;
  schema: GraphQLSchema;
  context: CompilerContext;
}

const setup = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<Compiled> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(createStoreQueryFn(store), PREFIXES, options);
  return {
    result,
    schema: result.schema,
    context: result.createContext(store),
  };
};

const run = async (compiled: Compiled, source: string) =>
  graphql({ schema: compiled.schema, source, contextValue: compiled.context });

// A class-ranged property, an inverse pair, an undeclared (unknown) range,
// and a domainless property — one fixture covering the range-kind branches
// that are reachable through full compilation.
const RANGE_TTL = `
@prefix ex: <http://example.org/> .
@prefix ext: <http://external.example/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Thing a owl:Class ; rdfs:label "Thing" .
ex:Cat a owl:Class ; rdfs:label "Cat" .

ex:rel a owl:ObjectProperty ; rdfs:domain ex:Thing ; rdfs:range ex:Cat .
ex:weird a owl:ObjectProperty ; rdfs:domain ex:Thing ; rdfs:range ext:Mystery .
ex:free a owl:DatatypeProperty ; rdfs:range xsd:string .

ex:hasChild a owl:ObjectProperty ;
  rdfs:domain ex:Thing ; rdfs:range ex:Cat ; owl:inverseOf ex:childOf .
ex:childOf a owl:ObjectProperty ; rdfs:domain ex:Cat ; rdfs:range ex:Thing .

ex:t1 a ex:Thing .
ex:c1 a ex:Cat .
`;

describe("Ontology and lookups", () => {
  it("lists ontologies with classes and properties", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        ontologies {
          prefix
          namespace
          label
          classes { label }
          properties { label kind functional namespace }
        }
        ontology(prefix: "ex") { prefix }
        unknown: ontology(prefix: "zz") { prefix }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const ontologies = result.data?.ontologies as Array<
      Record<string, unknown>
    >;
    const ex = ontologies.find((o) => o.prefix === "ex");
    expect(ex?.namespace).toBe("http://example.org/");
    expect((ex?.classes as unknown[]).length).toBe(1);
    expect((ex?.properties as unknown[]).length).toBe(2);
    expect((result.data?.ontology as { prefix: string }).prefix).toBe("ex");
    expect(result.data?.unknown).toBeNull();
  });

  it("resolves ontologyProperty with scalar ranges and datatype kind", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyProperty(uri: "http://example.org/count") {
          uri label kind functional range namespace
          domain { label }
          inverse { uri }
        }
        missing: ontologyProperty(uri: "http://example.org/nope") { uri }
        prefixed: ontologyProperty(uri: "ex:count") { uri }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const property = result.data?.ontologyProperty as Record<string, unknown>;
    expect(property.kind).toBe("DATATYPE");
    expect(property.functional).toBe(true); // datatype default is singular
    expect(property.range).toContain("integer");
    expect((property.domain as { label: string }).label).toBe("Thing");
    expect(property.inverse).toBeNull();
    expect(result.data?.missing).toBeNull();
    // Prefixed form resolves like ontologyClass does.
    expect((result.data?.prefixed as { uri: string }).uri).toBe(
      "http://example.org/count",
    );
  });

  it("resolves class and unknown ranges, an inverse, and an absent domain", async () => {
    const compiled = await setup(RANGE_TTL);
    const result = await run(
      compiled,
      `{
        rel: ontologyProperty(uri: "http://example.org/rel") {
          range
          domain { label }
        }
        weird: ontologyProperty(uri: "http://example.org/weird") { range }
        domainless: ontologyProperty(uri: "http://example.org/free") {
          domain { label }
        }
        inv: ontologyProperty(uri: "http://example.org/childOf") {
          inverse { uri }
          definition
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    // class range resolves to the member class URI.
    const rel = result.data?.rel as Record<string, unknown>;
    expect(rel.range).toBe("http://example.org/Cat");
    expect((rel.domain as { label: string }).label).toBe("Thing");
    // unknown range echoes the raw URI string.
    expect((result.data?.weird as { range: string }).range).toBe(
      "http://external.example/Mystery",
    );
    // a property with no rdfs:domain has a null domain.
    expect((result.data?.domainless as { domain: unknown }).domain).toBeNull();
    // an inverse pair exposes the inverse property; definition is absent here.
    const inv = result.data?.inv as {
      inverse: { uri: string };
      definition: string | null;
    };
    expect(inv.inverse.uri).toBe("http://example.org/hasChild");
    expect(inv.definition).toBeNull();
  });

  it("exposes class definition, namespace, and falls back through prefixed lookups", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        byFull: ontologyClass(uri: "https://ds.canonical.com/Component") {
          definition
          namespace
        }
        byPrefixed: ontologyClass(uri: "ds:Component") { uri }
        missingClass: ontologyClass(uri: "nope:Nope") { uri }
        propByPrefixed: ontologyProperty(uri: "ds:name") { uri }
        missingProp: ontologyProperty(uri: "nope:nope") { uri }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const cls = result.data?.byFull as Record<string, unknown>;
    expect(cls.definition).toBe("A reusable UI component.");
    expect(cls.namespace).toBe("ds");
    // prefixed-form fallback resolves both class and property…
    expect((result.data?.byPrefixed as { uri: string }).uri).toBe(
      "https://ds.canonical.com/Component",
    );
    expect((result.data?.propByPrefixed as { uri: string }).uri).toBe(
      "https://ds.canonical.com/name",
    );
    // …and an unmatched prefixed form falls through to null.
    expect(result.data?.missingClass).toBeNull();
    expect(result.data?.missingProp).toBeNull();
  });

  it("walks superclass chains on OntologyClass", async () => {
    const compiled = await setup(INHERITANCE_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Widget") {
          label
          isAbstract
          superclass { label }
          superclasses { label }
          subclasses { label }
        }
        root: ontologyClass(uri: "http://example.org/Entity") {
          isAbstract
          superclass { label }
          subclasses { label }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const widget = result.data?.ontologyClass as Record<string, unknown>;
    expect(widget.isAbstract).toBe(false);
    expect((widget.superclass as { label: string }).label).toBe("Tangible");
    expect(
      (widget.superclasses as Array<{ label: string }>).map((c) => c.label),
    ).toEqual(["Tangible", "Entity"]);
    const root = result.data?.root as Record<string, unknown>;
    expect(root.isAbstract).toBe(true);
    expect(root.superclass).toBeNull();
    expect(
      (root.subclasses as Array<{ label: string }>).map((c) => c.label),
    ).toEqual(["Tangible"]);
  });

  it("exposes per-class SHACL cardinality through ClassProperty", async () => {
    const compiled = await setup(SHACL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Spec") {
          properties {
            property { label }
            required
            singular
            inherited
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const properties = (result.data?.ontologyClass as Record<string, unknown>)
      .properties as Array<{
      property: { label: string };
      required: boolean;
      singular: boolean;
      inherited: boolean;
    }>;
    const root = properties.find((p) => p.property.label === "root");
    expect(root?.required).toBe(true);
    expect(root?.singular).toBe(true);
    expect(root?.inherited).toBe(false);
  });

  it("returns annotation metadata through OntologyProperty", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        ontologyProperty(uri: "https://ds.canonical.com/name") {
          acceptanceCriteria
          completionGuidance
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const property = result.data?.ontologyProperty as Record<string, unknown>;
    expect(property.acceptanceCriteria).toBe(
      "Must be a human-readable display name.",
    );
    expect(property.completionGuidance).toBeNull();
  });
});

describe("OntologyClass as a Node", () => {
  it("serves _meta through the ClassNode adapter, typed by the meta-class", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Thing") {
          uri
          _meta {
            title
            label
            comment
            definition
            type { uri label definition namespace isAbstract }
            fields { property { uri } }
            field(name: "name") { required }
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const cls = result.data?.ontologyClass as {
      uri: string;
      _meta: Record<string, unknown>;
    };
    expect(cls.uri).toBe("http://example.org/Thing");
    // The adapter turned the ClassNode's own label/definition into canonical
    // triples, so the ordinary descriptive chain answers.
    expect(cls._meta.title).toBe("Thing");
    expect(cls._meta.label).toBe("Thing");
    expect(cls._meta.comment).toBeNull();
    expect(cls._meta.definition).toBe("A concrete thing.");
    // The class of a class is the meta-class, honestly owl:Class.
    expect(cls._meta.type).toEqual({
      uri: "http://www.w3.org/2002/07/owl#Class",
      label: "Class",
      definition: "The class of OWL classes.",
      namespace: "owl",
      isAbstract: false,
    });
    // The meta-class has no mapped ClassProperties: an empty list and a
    // field() miss are the honest answers, not errors.
    expect(cls._meta.fields).toEqual([]);
    expect(cls._meta.field).toBeNull();
  });

  it("round-trips the meta-class through ontologyClass, by IRI and prefixed form", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        byIri: ontologyClass(uri: "http://www.w3.org/2002/07/owl#Class") {
          uri
          label
          definition
          namespace
          isAbstract
          superclass { uri }
          superclasses { uri }
          subclasses { uri }
          properties { required }
        }
        byPrefixed: ontologyClass(uri: "owl:Class") {
          _meta { title definition type { uri instanceCount } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.byIri).toEqual({
      uri: "http://www.w3.org/2002/07/owl#Class",
      label: "Class",
      definition: "The class of OWL classes.",
      namespace: "owl",
      isAbstract: false,
      superclass: null,
      superclasses: [],
      subclasses: [],
      properties: [],
    });
    // The meta-class self-describes through the same adapter as every class:
    // its own type is itself, and its instanceCount speaks ir.classes.
    expect(result.data?.byPrefixed).toEqual({
      _meta: {
        title: "Class",
        definition: "The class of OWL classes.",
        type: {
          uri: "http://www.w3.org/2002/07/owl#Class",
          instanceCount: 1,
        },
      },
    });
  });

  it("adapts a definition-less class without minting an empty definition", async () => {
    const compiled = await setup(INHERITANCE_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Widget") {
          _meta { title definition }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = (
      result.data?.ontologyClass as { _meta: Record<string, unknown> }
    )._meta;
    expect(meta.title).toBe("Widget");
    expect(meta.definition).toBeNull();
  });
});

describe("EntityMeta descriptive binding (graphql:*From)", () => {
  // One fixture: Doc annotates titleFrom/commentFrom/definitionFrom; its
  // subclass Sub adds labelFrom. Instances assert the canonical predicates
  // TOO, so every assertion proves the annotated head BEATS the canonical
  // tier rather than merely filling a gap.
  const DESCRIPTIVE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix graphql: <${GRAPHQL}> .

ex:Doc a owl:Class ; rdfs:label "Doc" ;
  graphql:titleFrom ex:heading ;
  graphql:commentFrom ex:note ;
  graphql:definitionFrom ex:blurb .
ex:Sub a owl:Class ; rdfs:subClassOf ex:Doc ;
  graphql:labelFrom ex:shortName .

ex:heading a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:note a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:blurb a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:shortName a owl:DatatypeProperty ; rdfs:domain ex:Sub ; rdfs:range xsd:string .

ex:d1 a ex:Doc ;
  rdfs:label "L1" ;
  rdfs:comment "C1" ;
  ex:heading "H1" ;
  ex:note "N1" ;
  ex:blurb "B1" .
ex:d2 a ex:Doc ;
  rdfs:label "L2" .
ex:s1 a ex:Sub ;
  rdfs:label "SL" ;
  ex:heading "SH" ;
  ex:shortName "SN" .
`;

  it("puts the annotated predicate ahead of the canonical tier — it beats rdfs:label", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(
      compiled,
      `{ doc(uri: "ex:d1") { _meta { title label comment definition } } }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = (result.data?.doc as { _meta: Record<string, unknown> })._meta;
    // titleFrom heads the title chain: H1, not the asserted rdfs:label L1.
    expect(meta.title).toBe("H1");
    // Doc declares no labelFrom, so label keeps the canonical resolution —
    // the title and label chains diverge ONLY where annotated.
    expect(meta.label).toBe("L1");
    // commentFrom beats the asserted rdfs:comment; definitionFrom resolves
    // a field the unannotated chain would never reach (blurb is no
    // canonical predicate and no local-name-tier match).
    expect(meta.comment).toBe("N1");
    expect(meta.definition).toBe("B1");
  });

  it("keeps title total: an instance lacking the annotated predicate falls through the fixed chain", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(
      compiled,
      `{ doc(uri: "ex:d2") { _meta { title comment } } }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = (result.data?.doc as { _meta: Record<string, unknown> })._meta;
    expect(meta.title).toBe("L2");
    expect(meta.comment).toBeNull();
  });

  it("inherits *From declarations nearest-first down the class tree", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(
      compiled,
      `{ sub(uri: "ex:s1") { _meta { title label } } }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = (result.data?.sub as { _meta: Record<string, unknown> })._meta;
    // titleFrom is inherited from Doc (Sub declares none of its own)...
    expect(meta.title).toBe("SH");
    // ...while Sub's own labelFrom beats the asserted rdfs:label.
    expect(meta.label).toBe("SN");
  });
});

describe("EntityMeta edge cases", () => {
  it("returns null for unknown field names", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        thing(uri: "ex:widget") {
          _meta { field(name: "doesNotExist") { required } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect(
      (result.data?.thing as { _meta: { field: unknown } })._meta.field,
    ).toBeNull();
  });
});

// One property reached from two classes with different per-class cardinality.
// A datatype property is singular by default, so ex:tag is `tag` on Base; the
// SHACL shape re-opens it to many on Wide, where it is `tags`. That is the
// whole justification for ClassProperty.name being class-scoped — the SAME
// property has two field names, and no consumer can derive which from
// property.uri.
const PER_CLASS_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:Base a owl:Class ; rdfs:label "Base" .
ex:Wide a owl:Class ; rdfs:subClassOf ex:Base ; rdfs:label "Wide" .

ex:tag a owl:DatatypeProperty ; rdfs:domain ex:Base ; rdfs:range xsd:string .

ex:WideShape a sh:NodeShape ; sh:targetClass ex:Wide ;
  sh:property [ sh:path ex:tag ; sh:maxCount 5 ] .

ex:b1 a ex:Base . ex:w1 a ex:Wide .
`;

// An INSTANCE-FREE superclass, which the compiler emits as an interface rather
// than a type. The (class, property) name index is built from types AND
// interfaces, and only the interface half can be observed here: ex:part is a
// multi-valued object property, so the emitted field is `parts` while the OWL
// local name is `part`. Every other ClassProperty.name fixture uses concrete
// classes, or abstract ones whose singular fields make the two spellings
// coincide — so without this pair, dropping `mapped.interfaces` from the index
// leaves the whole suite green while abstract classes silently answer a name
// `field(name:)` rejects. ex:Piece exists to give ex:part a declared range.
const ABSTRACT_FIELD_NAME_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Container a owl:Class ; rdfs:label "Container" .
ex:Box a owl:Class ; rdfs:subClassOf ex:Container ; rdfs:label "Box" .
ex:Piece a owl:Class ; rdfs:label "Piece" .

ex:part a owl:ObjectProperty ; rdfs:domain ex:Container ; rdfs:range ex:Piece .

ex:b1 a ex:Box .
ex:p1 a ex:Piece .
`;

describe("EntityMeta.curie", () => {
  it("renders the compact form of an entity IRI and of a class IRI", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        components(first: 1) { edges { node { uri _meta { curie } } } }
        ontologyClass(uri: "ds:Component") { uri _meta { curie } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const node = (
      result.data?.components as {
        edges: { node: { uri: string; _meta: { curie: string } } }[];
      }
    ).edges[0]?.node;
    // Identity is untouched — curie is a SECOND string, not a replacement.
    expect(node?.uri).toBe("https://ds.canonical.com/global.component.button");
    expect(node?._meta.curie).toBe("ds:global.component.button");
    expect(result.data?.ontologyClass).toEqual({
      uri: "https://ds.canonical.com/Component",
      _meta: { curie: "ds:Component" },
    });
  });

  it("answers the GraphQL type name for an embedded value with no IRI", async () => {
    const compiled = await setup(BLANK_NODES_TTL);
    const result = await run(
      compiled,
      `{ standard(uri: "ex:s1") { uri _meta { curie } examples { _meta { curie title } } } }`,
    );
    expect(result.errors).toBeUndefined();
    const standard = result.data?.standard as {
      uri: string;
      _meta: { curie: string };
      examples: { _meta: { curie: string; title: string } }[];
    };
    expect(standard.uri).toBe("http://example.org/s1");
    expect(standard._meta.curie).toBe("ex:s1");
    // A blank node has no IRI to compact — the same tail `title` takes.
    expect(standard.examples).toHaveLength(2);
    for (const example of standard.examples) {
      expect(example._meta.curie).toBe("Example");
      expect(example._meta.title).toBe("Example");
    }
  });
});

describe("ClassProperty.name", () => {
  it("is the exact string field(name:) accepts — every entry round-trips", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "ds:Component") {
          properties { name property { uri } }
        }
        components(first: 1) { edges { node { _meta {
          fields { name property { uri } }
        } } } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const fields = (
      result.data?.components as {
        edges: {
          node: {
            _meta: { fields: { name: string; property: { uri: string } }[] };
          };
        }[];
      }
    ).edges[0]?.node._meta.fields as {
      name: string;
      property: { uri: string };
    }[];
    // Names are the EMITTED field names, pluralized where the class's
    // cardinality made the field a list — not the OWL local names.
    expect(fields.map((f) => f.name)).toEqual([
      "subcomponents",
      "properties",
      "modifierFamilies",
      "tier",
      "summary",
      "name",
    ]);
    // OntologyClass.properties agrees with EntityMeta.fields: one index.
    expect(
      (
        result.data?.ontologyClass as {
          properties: { name: string; property: { uri: string } }[];
        }
      ).properties,
    ).toEqual(fields);

    // The round trip, driven from the answers rather than from a literal.
    const roundTrip = await run(
      compiled,
      `{ components(first: 1) { edges { node { _meta {
        ${fields.map((f, i) => `f${i}: field(name: "${f.name}") { name property { uri } }`).join("\n")}
      } } } } }`,
    );
    expect(roundTrip.errors).toBeUndefined();
    const meta = (
      roundTrip.data?.components as {
        edges: { node: { _meta: Record<string, unknown> } }[];
      }
    ).edges[0]?.node._meta as Record<string, unknown>;
    for (const [i, field] of fields.entries()) {
      expect(meta[`f${i}`]).toEqual(field);
    }
  });

  it("is class-scoped: one property, two names, from per-class cardinality", async () => {
    const compiled = await setup(PER_CLASS_TTL);
    const result = await run(
      compiled,
      `{
        base: ontologyClass(uri: "ex:Base") { properties { name singular property { uri } } }
        wide: ontologyClass(uri: "ex:Wide") { properties { name singular property { uri } } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const firstOf = (key: string) =>
      (
        result.data?.[key] as {
          properties: {
            name: string;
            singular: boolean;
            property: { uri: string };
          }[];
        }
      ).properties[0];
    // Same ex:tag, two classes, two field names. This is the derivation a
    // consumer cannot perform from property.uri, which is why `name` exists.
    expect(firstOf("base")).toEqual({
      name: "tag",
      singular: true,
      property: { uri: "http://example.org/tag" },
    });
    expect(firstOf("wide")).toEqual({
      name: "tags",
      singular: false,
      property: { uri: "http://example.org/tag" },
    });
  });

  it("answers the EMITTED field name for an abstract class, not the OWL local name", async () => {
    const compiled = await setup(ABSTRACT_FIELD_NAME_TTL);
    const result = await run(
      compiled,
      `{
        container: ontologyClass(uri: "ex:Container") {
          isAbstract
          properties { name property { uri } }
        }
        boxClass: ontologyClass(uri: "ex:Box") { properties { name property { uri } } }
        boxInstance: box(uri: "ex:b1") { _meta { field(name: "parts") { name } } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const container = result.data?.container as {
      isAbstract: boolean;
      properties: { name: string; property: { uri: string } }[];
    };
    // The fixture only bites while ex:Container really is instance-free — an
    // added instance would emit it as a type and the interface half of the
    // index would go unobserved again, silently.
    expect(container.isAbstract).toBe(true);
    // `parts`, the pluralized name the interface actually emits — NOT `part`,
    // the OWL local name the last-rung fallback hands back when the class is
    // missing from the index.
    expect(container.properties).toEqual([
      { name: "parts", property: { uri: "http://example.org/part" } },
    ]);
    expect(
      (result.data?.boxClass as { properties: unknown }).properties,
    ).toEqual(container.properties);
    // And it is a name field(name:) accepts, which `part` is not — the
    // round-trip guarantee the field's own description promises.
    expect(
      (result.data?.boxInstance as { _meta: { field: unknown } })._meta.field,
    ).toEqual({ name: "parts" });
  });

  it("answers a synthetic inverse field by the name it was configured under", async () => {
    // The synthetic inverse field carries the FORWARD property's URI, so a
    // reverse lookup on (class, property) would answer with the forward
    // field's name or with nothing. field(name:) carries the real name across.
    const compiled = await setup(DS_REALISTIC_TTL, {
      mappings: {
        "ds:implementsBlock": { inverse: { graphqlName: "usedBy" } },
      },
    });
    const result = await run(
      compiled,
      `{ components(first: 1) { edges { node { _meta {
        field(name: "usedBy") { name property { uri } }
      } } } } }`,
    );
    expect(result.errors).toBeUndefined();
    expect(
      (
        result.data?.components as {
          edges: { node: { _meta: { field: unknown } } }[];
        }
      ).edges[0]?.node._meta.field,
    ).toEqual({
      name: "usedBy",
      property: { uri: "https://ds.canonical.com/implementsBlock" },
    });
  });

  it("falls back to the OWL local name when the class projects no field", async () => {
    // SHACL sh:maxCount 0 omits ex:legacy from Spec (V010) while leaving it in
    // the class's property list. There is no name field(name:) would accept —
    // the local name is returned as a LABEL, and field() proves it is one.
    const compiled = await setup(SHACL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "ex:Spec") { properties { name property { uri } } }
        spec(uri: "ex:s1") { _meta { field(name: "legacy") { name } } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect(
      (
        result.data?.ontologyClass as {
          properties: { name: string; property: { uri: string } }[];
        }
      ).properties,
    ).toEqual([
      { name: "root", property: { uri: "http://example.org/root" } },
      { name: "legacy", property: { uri: "http://example.org/legacy" } },
    ]);
    expect(
      (result.data?.spec as { _meta: { field: unknown } })._meta.field,
    ).toBeNull();
  });
});

describe("datatype list fields", () => {
  it("resolves multi-valued datatype properties when forced to list", async () => {
    const compiled = await setup(MINIMAL_TTL, {
      mappings: { "ex:name": { singular: false, graphqlName: "names" } },
    });
    const result = await run(compiled, `{ thing(uri: "ex:widget") { names } }`);
    expect(result.errors).toBeUndefined();
    expect((result.data?.thing as { names: string[] }).names).toEqual([
      "Widget",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Defensive branches reachable only from synthetic parent values: a union
// range, ClassProperty rows pointing at unknown URIs, EntityMeta on an
// unmapped typename, and an instances window whose URI cannot round-trip.
// These states cannot be produced through normal compilation, so the schema
// is built directly with hand-crafted IR and parents fed through extra root
// fields wired to the returned object types.
// ---------------------------------------------------------------------------

const KNOWN = "urn:test#Known";
const UNION_PROP = "urn:test#unionProp";
const GHOST_PROP = "urn:test#ghostProp";

const unionProperty: PropertyNode = {
  uri: UNION_PROP,
  label: "unionProp",
  namespace: "t",
  kind: "object",
  domains: [KNOWN],
  range: { kind: "union", name: "PetUnion", members: ["Cat", "Dog"] },
  functional: false,
  classCardinality: new Map(),
  isAnnotation: false,
  annotations: new Map(),
};

const knownClass: ClassNode = {
  uri: KNOWN,
  label: "Known",
  namespace: "t",
  superclasses: [],
  ancestors: [],
  subclasses: [],
  isAbstract: false,
  embeddable: false,
  // GHOST_PROP has no PropertyNode → listClassProperties' `?? false` fires.
  ownProperties: [UNION_PROP],
  allProperties: [UNION_PROP, GHOST_PROP],
};

const buildSyntheticIR = (): MappedIR => {
  const classes = new Map<string, ClassNode>([[KNOWN, knownClass]]);
  const properties = new Map<string, PropertyNode>([
    [UNION_PROP, unionProperty],
  ]);
  const namespaces = new Map<string, NamespaceInfo>([
    ["t", { prefix: "t", uri: "urn:test#", classCount: 1, propertyCount: 1 }],
  ]);
  const ir: OntologyIR = {
    classes,
    properties,
    namespaces,
    graphql: { classes: new Map(), properties: new Map(), prefixes: new Map() },
    // Only instanceStats is read by the TBox schema; an empty map drives the
    // `?? 0` fallback in instanceCount.
    extraction: { instanceStats: new Map() } as unknown as RawExtraction,
  };
  return {
    ir,
    classes,
    properties,
    namespaces,
    types: new Map([
      [
        "Known",
        {
          owlUri: KNOWN,
          graphqlName: "Known",
          interfaces: [],
          fields: new Map(),
          embeddable: false,
          namespace: "t",
          pluralName: "knowns",
          singularName: "known",
        },
      ],
    ]),
    interfaces: new Map(),
    unions: new Map(),
    nameMap: {
      // KNOWN resolves to a name that exists in NEITHER types nor
      // interfaces — the synthetic-only state that drives isProjected's
      // final arm (name found, nothing minted under it).
      toGraphQL: (u: string) => (u === KNOWN ? "Phantom" : undefined),
      toOWL: (name: string) => (name === "Known" ? KNOWN : undefined),
      entries: () => [],
    },
  } as unknown as MappedIR;
};

const buildSyntheticSchema = (): GraphQLSchema => {
  const mapped = buildSyntheticIR();
  // A real (minimal) interface: OntologyClass now declares it through its
  // interfaces thunk, so schema construction walks it and execution-time
  // validation checks the implementation. `uri: ID!` is the subset of the
  // real Node that avoids the entityMeta forward reference — an implementor
  // may always carry more fields than its interface.
  const nodeInterface = new GraphQLInterfaceType({
    name: "Node",
    fields: { uri: { type: new GraphQLNonNull(GraphQLID) } },
  });
  const nodeConnection = () =>
    new GraphQLObjectType({
      name: "TestConnection",
      fields: { _empty: { type: GraphQLString } },
    });
  const tbox = buildTBoxSchema(mapped, nodeInterface, nodeConnection);

  const query = new GraphQLObjectType({
    name: "Query",
    fields: {
      // union range branch
      unionProp: {
        type: tbox.ontologyProperty,
        resolve: () => mapped.ir.properties.get(UNION_PROP),
      },
      // ClassProperty whose property is unknown → required/singular short to
      // false (resolveCardinality never called) and inherited's `?? false`.
      orphanProp: {
        type: tbox.classProperty,
        resolve: () => ({
          propertyUri: GHOST_PROP,
          classUri: "urn:test#NoClass",
        }),
      },
      // ClassProperty with a known property but an unknown class → required/
      // singular DO call resolveCardinality, whose `node?.ancestors ?? []`
      // default fires because the class is absent.
      orphanClassProp: {
        type: tbox.classProperty,
        resolve: () => ({
          propertyUri: UNION_PROP,
          classUri: "urn:test#NoClass",
        }),
      },
      // EntityMeta with an unmapped typename
      orphanMeta: {
        type: tbox.entityMeta,
        resolve: () => ({
          uri: null,
          typename: "NotAType",
          triples: new Map(),
        }),
      },
      // EntityMeta whose typename is an INTERFACE, not a concrete type — the
      // shape resolveEmbeddedTypename (resolver/templates.ts) produces when a
      // blank node's rdf:type maps to an abstract class. mapped.types is keyed
      // by concrete types only, so the precomputed chain map misses and the
      // canonical-tier fallback has to answer.
      interfaceMeta: {
        type: tbox.entityMeta,
        resolve: () => ({
          uri: "urn:test#embedded",
          typename: "AbstractThing",
          triples: new Map([
            [RDFS_LABEL, [{ kind: "literal", value: "From rdfs:label" }]],
          ]),
        }),
      },
      // EntityMeta whose IRI is in NO registered namespace — the arm where
      // toPrefixed finds no match and hands the input straight back.
      foreignMeta: {
        type: tbox.entityMeta,
        resolve: () => ({
          uri: "https://elsewhere.example/widgets/17",
          typename: "Known",
          triples: new Map(),
        }),
      },
      // ClassNode with an empty stats map and a ghost own-property
      knownClass: {
        type: tbox.ontologyClass,
        resolve: () => mapped.ir.classes.get(KNOWN),
      },
    },
  });

  return new GraphQLSchema({ query, types: [tbox.entityMeta] });
};

describe("TBox defensive branches (synthetic parents)", () => {
  const orphanContext = {
    // The instances listing performs no URI conversion at all: the bare token
    // rides the window verbatim, and the entity loader simply finds nothing.
    listLoader: { load: async () => ["orphan"] },
    entityLoader: { loadMany: async () => [null] },
  } as unknown as CompilerContext;

  it("joins union range members and reads the empty instanceCount fallback", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{
        unionProp { range }
        knownClass {
          namespace
          instanceCount
          properties { inherited }
          instances(first: 5) { _empty }
        }
      }`,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.unionProp as { range: string }).range).toBe(
      "Cat | Dog",
    );
    const cls = result.data?.knownClass as Record<string, unknown>;
    expect(cls.namespace).toBe("t");
    // The synthetic name map resolves this class to a name nothing was
    // minted under, so the population guard answers 0 (and `instances`
    // short-circuits to the empty connection without touching a loader);
    // the real loader-backed path is covered by the fixture-store tests.
    expect(cls.instanceCount).toBe(0);
    // listClassProperties runs the annotation filter against GHOST_PROP (no
    // PropertyNode → the `?? false` default keeps it) — both the union prop
    // and the ghost survive, so the list has two entries. `property` is left
    // unqueried because the ghost has no resolvable OntologyProperty.
    const props = cls.properties as Array<{ inherited: boolean }>;
    expect(props).toHaveLength(2);
  });

  it("hands back the absolute IRI when no registered namespace matches", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{
        matched: interfaceMeta { curie }
        unmatched: foreignMeta { curie }
        noIri: orphanMeta { curie }
      }`,
    });
    expect(result.errors).toBeUndefined();
    // A registered namespace compacts…
    expect(result.data?.matched).toEqual({ curie: "t:embedded" });
    // …and an IRI outside every registered namespace passes through
    // unchanged, which is what makes `curie` total without a null.
    expect(result.data?.unmatched).toEqual({
      curie: "https://elsewhere.example/widgets/17",
    });
    // No IRI at all: the typename tail, exactly where `title` ends up.
    expect(result.data?.noIri).toEqual({ curie: "NotAType" });
  });

  it("reports false cardinality and inherited for a ClassProperty with unknown URIs", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanProp { name required singular inherited } }`,
    });
    expect(result.errors).toBeUndefined();
    const cp = result.data?.orphanProp as Record<string, unknown>;
    // No container is indexed under this class at all, so `name` cannot come
    // from the emitted schema — the OWL local name answers.
    expect(cp.name).toBe("ghostProp");
    expect(cp.required).toBe(false);
    expect(cp.singular).toBe(false);
    // The class is unknown → ownProperties lookup yields the `?? false` default,
    // so the property is reported as inherited.
    expect(cp.inherited).toBe(true);
  });

  it("falls back to a known property's defaults when its class is unknown", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanClassProp { required singular } }`,
    });
    expect(result.errors).toBeUndefined();
    const cp = result.data?.orphanClassProp as Record<string, boolean>;
    // resolveCardinality found no class node and no per-class spec → the kind
    // default (object property → not singular, not required) applies.
    expect(cp.required).toBe(false);
    expect(cp.singular).toBe(false);
  });

  it("falls back to the canonical predicate tier for an interface typename", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ interfaceMeta { title label comment } }`,
    });
    expect(result.errors).toBeUndefined();
    const meta = result.data?.interfaceMeta as Record<string, unknown>;
    // The class-specific local-name tier is unknowable for an interface, but
    // rdfs:label is still exactly right — no throw, no "", no non-null `!`.
    expect(meta.label).toBe("From rdfs:label");
    expect(meta.title).toBe("From rdfs:label");
    // rdfs:comment is unasserted and the fallback chain has nothing else.
    expect(meta.comment).toBeNull();
  });

  it("resolves title through the IRI local name when nothing is asserted", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      // orphanMeta has uri: null AND no triples → the typename tail.
      source: `{ orphanMeta { title label } }`,
    });
    expect(result.errors).toBeUndefined();
    const meta = result.data?.orphanMeta as Record<string, unknown>;
    expect(meta.label).toBeNull();
    expect(meta.title).toBe("NotAType");
  });

  it("returns an empty field list for an unmapped EntityMeta typename", async () => {
    const schema = buildSyntheticSchema();
    // `fields` is queried alone: an unmapped typename yields no class node, so
    // the resolver returns [] without touching the non-null `type` field.
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanMeta { fields { property { uri } } } }`,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.orphanMeta as { fields: unknown[] }).fields).toEqual(
      [],
    );
  });

  it("nulls the non-null EntityMeta type for an unmapped typename", async () => {
    const schema = buildSyntheticSchema();
    // `type` is non-null; an unmapped typename resolves it to null, which
    // bubbles a non-null violation and nulls the parent.
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanMeta { type { uri } } }`,
    });
    expect(result.data?.orphanMeta).toBeNull();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
