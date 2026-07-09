import type { QueryResult, Term } from "@canonical/ke";
import { describe, expect, it, vi } from "vitest";
import {
  type ClassNode,
  type MappedIR,
  type NamespaceInfo,
  type QueryFn,
  RDF_TYPE,
} from "../shared/index.js";
import createEntityLoader from "./createEntityLoader.js";

const NS = "https://ds.canonical.com/";

const namespaces = new Map<string, NamespaceInfo>([
  ["ds", { prefix: "ds", uri: NS, classCount: 0, propertyCount: 0 }],
]);

const named = (value: string): Term => ({ termType: "NamedNode", value });
const literal = (value: string): Term => ({ termType: "Literal", value });
const blank = (value: string): Term => ({ termType: "BlankNode", value });

/** Minimal MappedIR exposing only what the entity loader reads. */
const mappedFor = (classes: Map<string, ClassNode>): MappedIR =>
  ({
    ir: { classes },
    nameMap: { toGraphQL: (uri: string) => getLocalName(uri) },
    namespaces,
  }) as unknown as MappedIR;

const getLocalName = (uri: string) =>
  uri.slice(Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/")) + 1);

const concreteClass = (uri: string, ancestors: string[] = []): ClassNode =>
  ({ uri, isAbstract: false, ancestors }) as unknown as ClassNode;

const select = (termBindings: Record<string, Term>[]): QueryResult =>
  ({
    type: "select",
    variables: [],
    bindings: [],
    termBindings,
  }) as QueryResult;

const construct = (
  quads: { subject: Term; predicate: Term; object: Term }[],
): QueryResult => ({ type: "construct", triples: [], quads }) as QueryResult;

describe("createEntityLoader", () => {
  it("evicts the keys of a failed batch and rethrows (no memoized failure)", async () => {
    let calls = 0;
    const query: QueryFn = vi.fn(async () => {
      calls += 1;
      throw new Error("store down");
    });
    const loader = createEntityLoader(query, mappedFor(new Map()), new Map());

    await expect(loader.load(`${NS}thing`)).rejects.toThrow("store down");
    // A second load re-queries (the failed key was cleared, never memoized).
    await expect(loader.load(`${NS}thing`)).rejects.toThrow("store down");
    expect(calls).toBe(2);
  });

  it("ignores a quad whose subject is neither NamedNode nor BlankNode", async () => {
    // resolveTripleSet returns undefined for a Literal subject → skipped.
    const query: QueryFn = async () =>
      construct([
        {
          subject: literal("oops"),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Widget`),
        },
      ]);
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Widget`, concreteClass(`${NS}Widget`)]])),
    );
    // No NamedNode subject row for the URI → missing entity.
    expect(await loader.load(`${NS}thing`)).toBeNull();
  });

  it("skips a quad whose predicate is not a NamedNode", async () => {
    const query: QueryFn = async () =>
      construct([
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Widget`),
        },
        // Blank-node predicate → continue (predicate.termType !== "NamedNode").
        {
          subject: named(`${NS}thing`),
          predicate: blank("p"),
          object: literal("ignored"),
        },
      ]);
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Widget`, concreteClass(`${NS}Widget`)]])),
    );
    const entity = await loader.load(`${NS}thing`);
    expect(entity?.typename).toBe("Widget");
    // Only the rdf:type triple survived; the blank-predicate quad was skipped.
    expect([...(entity?.triples.keys() ?? [])]).toEqual([RDF_TYPE]);
  });

  it("materializes a fresh blank-node child set, literals, and uri values", async () => {
    const query: QueryFn = async () =>
      construct([
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Widget`),
        },
        // Blank-node object never seen as a subject → fresh set created (40-41).
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}embed`),
          object: blank("b1"),
        },
        {
          subject: blank("b1"),
          predicate: named(`${NS}label`),
          object: literal("hi"),
        },
        // URI-valued object on the named subject.
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}ref`),
          object: named(`${NS}other`),
        },
        // Duplicate triple is deduped (seen).
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}ref`),
          object: named(`${NS}other`),
        },
      ]);
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Widget`, concreteClass(`${NS}Widget`)]])),
    );
    const entity = await loader.load(`${NS}thing`);
    const embed = entity?.triples.get(`${NS}embed`)?.[0];
    expect(embed?.kind).toBe("blank");
    // The blank child's own triples are populated through the shared set.
    expect(
      embed?.kind === "blank" && embed.triples.get(`${NS}label`)?.[0],
    ).toEqual({
      kind: "literal",
      value: "hi",
      datatype: undefined,
      language: undefined,
    });
    expect(entity?.triples.get(`${NS}ref`)).toEqual([
      { kind: "uri", value: `${NS}other` },
    ]);
  });

  it("returns null for a URI with no concrete class assertion", async () => {
    // Abstract class only → pickMostSpecificTypename yields undefined.
    const query: QueryFn = async () =>
      construct([
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Abstract`),
        },
      ]);
    const abstractNode = {
      uri: `${NS}Abstract`,
      isAbstract: true,
      ancestors: [],
    } as unknown as ClassNode;
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Abstract`, abstractNode]])),
    );
    expect(await loader.load(`${NS}thing`)).toBeNull();
  });

  it("treats an empty (select-shaped) result as all-missing", async () => {
    const query: QueryFn = async () => select([]);
    const loader = createEntityLoader(query, mappedFor(new Map()));
    expect(await loader.load(`${NS}thing`)).toBeNull();
  });

  it("picks the deepest concrete class, ignoring shallower and unknown ones", async () => {
    const query: QueryFn = async () =>
      construct([
        // Deepest concrete class first; shallower + unknown follow so the
        // ancestors-depth comparison runs its false branch too.
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Deep`),
        },
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Shallow`),
        },
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Unknown`),
        },
      ]);
    const classes = new Map([
      [`${NS}Deep`, concreteClass(`${NS}Deep`, [`${NS}Shallow`, `${NS}Base`])],
      [`${NS}Shallow`, concreteClass(`${NS}Shallow`, [`${NS}Base`])],
    ]);
    const loader = createEntityLoader(query, mappedFor(classes));
    expect((await loader.load(`${NS}thing`))?.typename).toBe("Deep");
  });

  it("creates a fresh triple set for a blank-node subject seen before any object use", async () => {
    // The blank node appears as a SUBJECT first (never yet seen as an object),
    // so resolveTripleSet takes its create-fresh branch for blank subjects.
    const query: QueryFn = async () =>
      construct([
        {
          subject: blank("orphan"),
          predicate: named(`${NS}label`),
          object: literal("first"),
        },
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Widget`),
        },
      ]);
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Widget`, concreteClass(`${NS}Widget`)]])),
    );
    expect((await loader.load(`${NS}thing`))?.typename).toBe("Widget");
  });

  it("reuses an existing blank-node set when the same blank object recurs", async () => {
    // The same blank node is referenced by two predicates, so the second
    // conversion finds its set already present instead of creating a fresh one.
    const query: QueryFn = async () =>
      construct([
        {
          subject: named(`${NS}thing`),
          predicate: named(RDF_TYPE),
          object: named(`${NS}Widget`),
        },
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}a`),
          object: blank("shared"),
        },
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}b`),
          object: blank("shared"),
        },
      ]);
    const loader = createEntityLoader(
      query,
      mappedFor(new Map([[`${NS}Widget`, concreteClass(`${NS}Widget`)]])),
    );
    const entity = await loader.load(`${NS}thing`);
    const a = entity?.triples.get(`${NS}a`)?.[0];
    const b = entity?.triples.get(`${NS}b`)?.[0];
    expect(a?.kind === "blank" && a.id).toBe("shared");
    expect(b?.kind === "blank" && b.id).toBe("shared");
  });

  it("treats a URI with triples but no rdf:type as typeless (null)", async () => {
    // No rdf:type predicate at all → typeUris falls back to [] (175).
    const query: QueryFn = async () =>
      construct([
        {
          subject: named(`${NS}thing`),
          predicate: named(`${NS}label`),
          object: literal("x"),
        },
      ]);
    const loader = createEntityLoader(query, mappedFor(new Map()));
    expect(await loader.load(`${NS}thing`)).toBeNull();
  });
});
