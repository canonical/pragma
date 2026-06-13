// =============================================================================
// TBox schema surface (§1.6/§11.4): Ontology, OntologyClass, OntologyProperty,
// ClassProperty, EntityMeta lookups and edge cases.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { type GraphQLSchema, graphql } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  type CompilerContext,
  type CompilerResult,
  compile,
} from "../src/index.js";
import { storeQueryFn } from "../src/lib/compiler/index.js";
import {
  DS_REALISTIC_TTL,
  INHERITANCE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "./fixtures.js";

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
  const result = await compile(storeQueryFn(store), PREFIXES, options);
  return {
    result,
    schema: result.schema,
    context: result.createContext(store),
  };
};

const run = async (compiled: Compiled, source: string) =>
  graphql({ schema: compiled.schema, source, contextValue: compiled.context });

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
