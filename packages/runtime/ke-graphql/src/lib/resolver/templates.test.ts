import { describe, expect, it, vi } from "vitest";
import {
  type CompilerContext,
  type EntityValue,
  type FieldTypeSpec,
  type MappedField,
  RDF_TYPE,
  type TripleSet,
  type TripleValue,
} from "../shared/index.js";
import {
  createDatatypeListResolver,
  createDatatypeResolver,
  createEmbeddedListResolver,
  createEmbeddedSingularResolver,
  createInverseResolver,
  createObjectListResolver,
  createObjectSingularResolver,
} from "./templates.js";

const NS = "https://ds.canonical.com/";

const namespaces = new Map([
  ["ds", { prefix: "ds", uri: NS, classCount: 0, propertyCount: 0 }],
]);

/** Build a MappedField with sensible defaults; override per test. */
const field = (over: Partial<MappedField>): MappedField =>
  ({
    owlUri: `${NS}p`,
    graphqlName: "p",
    type: { kind: "scalar", name: "String" } as FieldTypeSpec,
    nullable: true,
    list: false,
    resolverTemplate: "datatype",
    propertyUri: `${NS}p`,
    shaclRequired: false,
    nonNull: false,
    ...over,
  }) as MappedField;

const triples = (entries: [string, TripleValue[]][] = []): TripleSet =>
  new Map(entries);

const entity = (over: Partial<EntityValue>): EntityValue => ({
  uri: "ds:thing",
  typename: "Widget",
  triples: triples(),
  ...over,
});

/** Mock context whose loaders are plain spies. */
const makeCtx = (over: Partial<CompilerContext> = {}): CompilerContext => {
  const warn = vi.fn();
  return {
    entityLoader: {
      load: vi.fn(async (uri: string) => entity({ uri })),
      loadMany: vi.fn(async (uris: string[]) =>
        uris.map((uri) => entity({ uri })),
      ),
    },
    inverseLoader: { load: vi.fn(async () => [] as string[]) },
    nameMap: { toGraphQL: (uri: string) => getLocalName(uri) },
    namespaces,
    warn,
    ...over,
  } as unknown as CompilerContext;
};

const getLocalName = (uri: string) =>
  uri.slice(Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/")) + 1);

const lit = (value: string, datatype?: string): TripleValue => ({
  kind: "literal",
  value,
  datatype,
});
const uri = (value: string): TripleValue => ({ kind: "uri", value });
const blankVal = (t: TripleSet): TripleValue => ({
  kind: "blank",
  id: "_:b",
  triples: t,
});

const noArgs = {} as never;

describe("createDatatypeResolver", () => {
  it("returns null when there are no values", async () => {
    const resolve = createDatatypeResolver(field({}));
    expect(
      await resolve(entity({}), noArgs, makeCtx(), {} as never),
    ).toBeNull();
  });

  it("coerces the first literal to the field scalar", async () => {
    const resolve = createDatatypeResolver(
      field({ type: { kind: "scalar", name: "Int" } }),
    );
    const parent = entity({ triples: triples([[`${NS}p`, [lit("42")]]]) });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBe(42);
  });

  it("surfaces a URI value as a string on the B003 String fallback", async () => {
    // Non-scalar field type → getScalarName returns "String".
    const resolve = createDatatypeResolver(
      field({ type: { kind: "type", name: "Thing" } }),
    );
    const parent = entity({ triples: triples([[`${NS}p`, [uri(`${NS}x`)]]]) });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBe(
      `${NS}x`,
    );
  });

  it("returns null for a URI value when the scalar is not String", async () => {
    const resolve = createDatatypeResolver(
      field({ type: { kind: "scalar", name: "Int" } }),
    );
    const parent = entity({ triples: triples([[`${NS}p`, [uri(`${NS}x`)]]]) });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBeNull();
  });
});

describe("createDatatypeListResolver", () => {
  it("returns [] when there are no values", async () => {
    const resolve = createDatatypeListResolver(field({}));
    expect(await resolve(entity({}), noArgs, makeCtx(), {} as never)).toEqual(
      [],
    );
  });

  it("coerces literals, surfaces String-fallback URIs, drops the rest", async () => {
    const resolve = createDatatypeListResolver(
      field({ type: { kind: "type", name: "Thing" } }),
    );
    const parent = entity({
      triples: triples([
        [`${NS}p`, [lit("a"), uri(`${NS}x`), blankVal(triples())]],
      ]),
    });
    // String fallback: literal "a" and URI both surface; the blank is dropped.
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toEqual([
      "a",
      `${NS}x`,
    ]);
  });

  it("drops uncoercible literals and non-String URIs", async () => {
    const resolve = createDatatypeListResolver(
      field({ type: { kind: "scalar", name: "Int" } }),
    );
    const parent = entity({
      triples: triples([[`${NS}p`, [lit("notnum"), uri(`${NS}x`)]]]),
    });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toEqual([]);
  });
});

describe("createObjectSingularResolver", () => {
  it("loads the referenced entity from a URI value", async () => {
    const resolve = createObjectSingularResolver(field({}));
    const ctx = makeCtx();
    const parent = entity({ triples: triples([[`${NS}p`, [uri(`${NS}x`)]]]) });
    const result = (await resolve(
      parent,
      noArgs,
      ctx,
      {} as never,
    )) as EntityValue;
    expect(result.uri).toBe(`${NS}x`);
    expect(ctx.entityLoader.load).toHaveBeenCalledWith(`${NS}x`);
  });

  it("falls back to the declared inverse assertion", async () => {
    const resolve = createObjectSingularResolver(
      field({ inverseOf: `${NS}fwd` }),
    );
    const ctx = makeCtx({
      inverseLoader: { load: vi.fn(async () => [`${NS}back`]) },
    } as Partial<CompilerContext>);
    const parent = entity({ uri: "ds:thing", triples: triples() });
    const result = (await resolve(
      parent,
      noArgs,
      ctx,
      {} as never,
    )) as EntityValue;
    expect(ctx.inverseLoader.load).toHaveBeenCalledWith(`${NS}fwd ds:thing`);
    expect(result.uri).toBe(`${NS}back`);
  });

  it("returns null when the inverse yields nothing", async () => {
    const resolve = createObjectSingularResolver(
      field({ inverseOf: `${NS}fwd` }),
    );
    const ctx = makeCtx({
      inverseLoader: { load: vi.fn(async () => [] as string[]) },
    } as Partial<CompilerContext>);
    const parent = entity({ uri: "ds:thing", triples: triples() });
    expect(await resolve(parent, noArgs, ctx, {} as never)).toBeNull();
  });

  it("returns null with no URI value and no declared inverse", async () => {
    const resolve = createObjectSingularResolver(field({}));
    const parent = entity({ uri: "ds:thing", triples: triples() });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBeNull();
  });

  it("returns null when an inverse is declared but the parent has no uri", async () => {
    const resolve = createObjectSingularResolver(
      field({ inverseOf: `${NS}fwd` }),
    );
    const parent = entity({ uri: null, triples: triples() });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBeNull();
  });
});

describe("createObjectListResolver", () => {
  it("returns an empty connection when there are no values", async () => {
    const resolve = createObjectListResolver(field({}));
    const result = (await resolve(
      entity({}),
      noArgs,
      makeCtx(),
      {} as never,
    )) as {
      edges: unknown[];
    };
    expect(result.edges).toEqual([]);
  });

  it("paginates and hydrates URI values into a connection", async () => {
    const resolve = createObjectListResolver(field({}));
    const ctx = makeCtx();
    const parent = entity({
      triples: triples([
        [`${NS}p`, [uri(`${NS}b`), uri(`${NS}a`), lit("ignored")]],
      ]),
    });
    const result = (await resolve(
      parent,
      { first: 10 } as never,
      ctx,
      {} as never,
    )) as {
      edges: { node: EntityValue }[];
    };
    // Sorted by prefixed URI: ds:a, ds:b.
    expect(result.edges.map((e) => e.node.uri)).toEqual([`${NS}a`, `${NS}b`]);
  });

  it("keeps a value verbatim when its prefix does not expand (toFull fallback)", async () => {
    const resolve = createObjectListResolver(field({}));
    const ctx = makeCtx();
    // "zz:thing" has no registered namespace: toPrefixed leaves it, and
    // toFull returns undefined → the loader key falls back to the raw value.
    const parent = entity({
      triples: triples([[`${NS}p`, [uri("zz:thing")]]]),
    });
    await resolve(parent, { first: 10 } as never, ctx, {} as never);
    expect(ctx.entityLoader.loadMany).toHaveBeenCalledWith(["zz:thing"]);
  });
});

describe("createInverseResolver", () => {
  it("unions forward triples and reverse assertions, deduped", async () => {
    const resolve = createInverseResolver(field({}), `${NS}fwd`);
    const ctx = makeCtx({
      inverseLoader: { load: vi.fn(async () => [`${NS}b`]) },
    } as Partial<CompilerContext>);
    const parent = entity({
      uri: "ds:thing",
      triples: triples([[`${NS}p`, [uri(`${NS}a`), lit("skip")]]]),
    });
    const result = (await resolve(
      parent,
      { first: 10 } as never,
      ctx,
      {} as never,
    )) as {
      edges: { node: EntityValue }[];
    };
    expect(result.edges.map((e) => e.node.uri)).toEqual([`${NS}a`, `${NS}b`]);
    expect(ctx.inverseLoader.load).toHaveBeenCalledWith(`${NS}fwd ds:thing`);
  });

  it("uses only forward triples when the parent has no uri", async () => {
    const resolve = createInverseResolver(field({}), `${NS}fwd`);
    const ctx = makeCtx();
    const parent = entity({
      uri: null,
      triples: triples([[`${NS}p`, [uri(`${NS}a`)]]]),
    });
    const result = (await resolve(
      parent,
      { first: 10 } as never,
      ctx,
      {} as never,
    )) as {
      edges: { node: EntityValue }[];
    };
    expect(result.edges.map((e) => e.node.uri)).toEqual([`${NS}a`]);
    expect(ctx.inverseLoader.load).not.toHaveBeenCalled();
  });

  it("returns an empty connection when the union is empty", async () => {
    const resolve = createInverseResolver(field({}), `${NS}fwd`);
    const parent = entity({ uri: null, triples: triples() });
    const result = (await resolve(parent, noArgs, makeCtx(), {} as never)) as {
      edges: unknown[];
    };
    expect(result.edges).toEqual([]);
  });
});

describe("createEmbeddedListResolver", () => {
  it("returns [] when there are no values", async () => {
    const resolve = createEmbeddedListResolver(field({}), "Range");
    expect(await resolve(entity({}), noArgs, makeCtx(), {} as never)).toEqual(
      [],
    );
  });

  it("materializes blank children, picking rdf:type or the range fallback", async () => {
    const resolve = createEmbeddedListResolver(field({}), "Range");
    const typed = triples([[RDF_TYPE, [uri(`${NS}Widget`)]]]);
    const untyped = triples();
    const parent = entity({
      triples: triples([
        [`${NS}p`, [blankVal(typed), blankVal(untyped), uri(`${NS}skip`)]],
      ]),
    });
    const result = (await resolve(
      parent,
      noArgs,
      makeCtx(),
      {} as never,
    )) as EntityValue[];
    expect(result.map((e) => e.typename)).toEqual(["Widget", "Range"]);
    expect(result.every((e) => e.uri === null)).toBe(true);
  });

  it("falls back to range when rdf:type is an unmapped URI", async () => {
    const resolve = createEmbeddedListResolver(field({}), "Range");
    // nameMap.toGraphQL returns "" for this; the resolver keeps scanning then
    // falls back to the range typename.
    const ctx = makeCtx({
      nameMap: { toGraphQL: () => undefined },
    } as Partial<CompilerContext>);
    const t = triples([[RDF_TYPE, [uri(`${NS}Unknown`), lit("ignored")]]]);
    const parent = entity({ triples: triples([[`${NS}p`, [blankVal(t)]]]) });
    const result = (await resolve(
      parent,
      noArgs,
      ctx,
      {} as never,
    )) as EntityValue[];
    expect(result[0]?.typename).toBe("Range");
  });
});

describe("createEmbeddedSingularResolver", () => {
  it("returns null when there is no blank value", async () => {
    const resolve = createEmbeddedSingularResolver(field({}), "Range");
    const parent = entity({ triples: triples([[`${NS}p`, [uri(`${NS}x`)]]]) });
    expect(await resolve(parent, noArgs, makeCtx(), {} as never)).toBeNull();
  });

  it("materializes the first blank child with its rdf:type typename", async () => {
    const resolve = createEmbeddedSingularResolver(field({}), "Range");
    const t = triples([[RDF_TYPE, [uri(`${NS}Widget`)]]]);
    const parent = entity({ triples: triples([[`${NS}p`, [blankVal(t)]]]) });
    const result = (await resolve(
      parent,
      noArgs,
      makeCtx(),
      {} as never,
    )) as EntityValue;
    expect(result.uri).toBeNull();
    expect(result.typename).toBe("Widget");
  });
});
