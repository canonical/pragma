import type { GraphQLFieldResolver } from "graphql";
import { describe, expect, it } from "vitest";
import type {
  CompilerContext,
  EntityValue,
  MappedIR,
  MappedType,
  NameMap,
  NamespaceInfo,
} from "../shared/index.js";
import type { FieldPlan, InterfacePlan, SchemaPlan, TypePlan } from "./emit.js";
import wireRelay from "./wireRelay.js";

type Resolve = GraphQLFieldResolver<EntityValue, CompilerContext>;

const nameMap: NameMap = {
  toGraphQL: () => undefined,
  toOWL: () => undefined,
  entries: () => [][Symbol.iterator](),
};

const namespaces = new Map<string, NamespaceInfo>([
  [
    "ex",
    {
      prefix: "ex",
      uri: "http://example.org/",
      classCount: 0,
      propertyCount: 0,
    },
  ],
]);

const listField = (
  base: string,
  kind: FieldPlan["type"]["kind"],
): FieldPlan => ({
  name: base,
  type: { base, kind, list: true, nonNull: true },
});

const typePlan = (
  over: Partial<TypePlan> & Pick<TypePlan, "name">,
): TypePlan => ({
  owlUri: `http://example.org/${over.name}`,
  interfaces: [],
  fields: new Map(),
  embeddable: false,
  ...over,
});

const ifacePlan = (
  over: Partial<InterfacePlan> & Pick<InterfacePlan, "name">,
): InterfacePlan => ({
  owlUri: `http://example.org/${over.name}`,
  parents: [],
  fields: new Map(),
  embeddableOnly: false,
  ...over,
});

const mappedType = (name: string): MappedType => ({
  owlUri: `http://example.org/${name}`,
  graphqlName: name,
  interfaces: [],
  fields: new Map(),
  embeddable: false,
  namespace: "ex",
  pluralName: `${name.toLowerCase()}s`,
  singularName: name.toLowerCase(),
});

describe("wireRelay connection wrapping", () => {
  it("wraps non-embeddable named lists and leaves embeddable/plain lists alone", () => {
    const plain = typePlan({
      name: "Plain",
      embeddable: true,
    });
    const embeddableInterface = ifacePlan({
      name: "EmbIface",
      embeddableOnly: true,
    });
    const concreteInterface = ifacePlan({ name: "ConcIface" });

    const host = typePlan({
      name: "Host",
      fields: new Map<string, FieldPlan>([
        // base is a non-embeddable type → wrapped
        ["entities", listField("Entity", "named")],
        // base is an embeddable type → stays plain
        ["plains", listField("Plain", "named")],
        // base is an embeddable-only interface → stays plain
        ["embs", listField("EmbIface", "named")],
        // base is a concrete (non-embeddable) interface → wrapped
        ["concs", listField("ConcIface", "named")],
        // base resolves to neither a type nor an interface → wrapped
        ["unknowns", listField("Mystery", "named")],
        // not a list → untouched
        [
          "scalar",
          {
            name: "scalar",
            type: {
              base: "String",
              kind: "scalar",
              list: false,
              nonNull: false,
            },
          },
        ],
        // a list but scalar kind → untouched
        ["tags", listField("String", "scalar")],
      ]),
    });

    const entity = typePlan({ name: "Entity" });

    const plan: SchemaPlan = {
      types: new Map([
        ["Host", host],
        ["Entity", entity],
        ["Plain", plain],
      ]),
      interfaces: new Map([
        ["EmbIface", embeddableInterface],
        ["ConcIface", concreteInterface],
      ]),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        types: new Map([
          ["Host", mappedType("Host")],
          ["Entity", mappedType("Entity")],
        ]),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };

    wireRelay(plan);
    const fields = plan.types.get("Host")?.fields;
    expect(fields?.get("entities")?.type.kind).toBe("connection");
    expect(fields?.get("entities")?.connectionArgs).toBe(true);
    expect(fields?.get("concs")?.type.kind).toBe("connection");
    expect(fields?.get("unknowns")?.type.kind).toBe("connection");
    // unchanged
    expect(fields?.get("plains")?.type.kind).toBe("named");
    expect(fields?.get("embs")?.type.kind).toBe("named");
    expect(fields?.get("scalar")?.type.kind).toBe("scalar");
    expect(fields?.get("tags")?.type.kind).toBe("scalar");
  });
});

describe("wireRelay Node membership", () => {
  it("gives embeddable-only interfaces _meta alone and concrete ones uri + _meta", () => {
    const embOnly = ifacePlan({ name: "EmbOnly", embeddableOnly: true });
    const concrete = ifacePlan({ name: "Concrete" });

    const plan: SchemaPlan = {
      types: new Map(),
      interfaces: new Map([
        ["EmbOnly", embOnly],
        ["Concrete", concrete],
      ]),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        types: new Map(),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };

    wireRelay(plan);
    // embeddable-only interface: _meta but no uri, and no Node parent
    expect([...(plan.interfaces.get("EmbOnly")?.fields.keys() ?? [])]).toEqual([
      "_meta",
    ]);
    expect(plan.interfaces.get("EmbOnly")?.parents).not.toContain("Node");
    // concrete interface: uri + _meta, Node parent
    expect([...(plan.interfaces.get("Concrete")?.fields.keys() ?? [])]).toEqual(
      ["uri", "_meta"],
    );
    expect(plan.interfaces.get("Concrete")?.parents).toContain("Node");
  });

  it("wires uri: ID! + _meta on concrete types and _meta alone on embeddables", () => {
    const plan: SchemaPlan = {
      types: new Map([
        ["Thing", typePlan({ name: "Thing" })],
        ["Emb", typePlan({ name: "Emb", embeddable: true })],
      ]),
      interfaces: new Map(),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        types: new Map([["Thing", mappedType("Thing")]]),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };

    wireRelay(plan);
    const thing = plan.types.get("Thing");
    expect([...(thing?.fields.keys() ?? [])]).toEqual(["uri", "_meta"]);
    expect(thing?.fields.get("uri")?.type).toEqual({
      base: "ID",
      kind: "scalar",
      list: false,
      nonNull: true,
    });
    expect(thing?.interfaces).toContain("Node");
    // R9: the embeddable is no longer skipped — it gets _meta but never uri,
    // which is the only thing standing between a zero-property embeddable and
    // a C003 "must define one or more fields" failure.
    const emb = plan.types.get("Emb");
    expect([...(emb?.fields.keys() ?? [])]).toEqual(["_meta"]);
    expect(emb?.interfaces).not.toContain("Node");
  });

  it("uri and _meta resolve straight off the parent EntityValue", () => {
    const plan: SchemaPlan = {
      types: new Map([["Thing", typePlan({ name: "Thing" })]]),
      interfaces: new Map(),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        types: new Map([["Thing", mappedType("Thing")]]),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };
    wireRelay(plan);
    const parent: EntityValue = {
      uri: "http://example.org/t1",
      typename: "Thing",
      triples: new Map(),
    };
    const fields = plan.types.get("Thing")?.fields;
    const uriResolve = fields?.get("uri")?.resolve as Resolve;
    const metaResolve = fields?.get("_meta")?.resolve as Resolve;
    // the ABSOLUTE IRI, verbatim — no prefixing anywhere in the identity path
    expect(uriResolve(parent, {}, {} as CompilerContext, {} as never)).toBe(
      "http://example.org/t1",
    );
    expect(metaResolve(parent, {}, {} as CompilerContext, {} as never)).toBe(
      parent,
    );
  });
});

describe("wireRelay root query fields", () => {
  const dummyCtx = {} as CompilerContext;

  it("skips embeddable types, owlUri-less types, and types missing from the mapped IR", () => {
    const plan: SchemaPlan = {
      types: new Map([
        // embeddable → skipped
        ["Emb", typePlan({ name: "Emb", embeddable: true })],
        // no owlUri → skipped
        ["NoUri", typePlan({ name: "NoUri", owlUri: undefined })],
        // owlUri present but absent from mapped.types → skipped (defensive)
        ["Ghost", typePlan({ name: "Ghost" })],
      ]),
      interfaces: new Map(),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        // intentionally empty: none of the above resolve here
        types: new Map(),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };

    wireRelay(plan);
    // only the node field exists; no per-type lookup/listing was added
    expect([...plan.queryFields.keys()]).toEqual(["node"]);
  });

  const thingPlan = (): SchemaPlan => {
    const plan: SchemaPlan = {
      types: new Map([["Thing", typePlan({ name: "Thing" })]]),
      interfaces: new Map(),
      unions: new Map(),
      queryFields: new Map(),
      mapped: {
        types: new Map([["Thing", mappedType("Thing")]]),
        interfaces: new Map(),
        unions: new Map(),
        nameMap,
        namespaces,
        ir: {
          classes: new Map(),
          properties: new Map(),
          namespaces: new Map(),
          extraction: {} as MappedIR["ir"]["extraction"],
        },
      } as unknown as MappedIR,
    };
    wireRelay(plan);
    return plan;
  };

  const resolverOf = (plan: SchemaPlan, name: string): Resolve => {
    const resolve = plan.queryFields.get(name)?.resolve;
    if (!resolve) {
      throw new Error(`expected a resolver for query field ${name}`);
    }
    return resolve as Resolve;
  };

  it("node and singular resolvers return null when the id/uri arg is absent", async () => {
    const plan = thingPlan();
    const node = resolverOf(plan, "node");
    const singular = resolverOf(plan, "thing");
    expect(await node(undefined, {}, dummyCtx, {} as never)).toBeNull();
    expect(await singular(undefined, {}, dummyCtx, {} as never)).toBeNull();
  });

  it("node rejects an id that is not a syntactically absolute IRI", async () => {
    const plan = thingPlan();
    const loaded: string[] = [];
    const ctx = {
      entityLoader: {
        load: async (key: string) => {
          loaded.push(key);
          return null;
        },
      },
    } as unknown as CompilerContext;
    const node = resolverOf(plan, "node");
    // "Thing" has no scheme at all: rejected before the loader is touched.
    expect(await node(undefined, { id: "Thing" }, ctx, {} as never)).toBeNull();
    expect(loaded).toEqual([]);
    // an absolute IRI reaches the loader verbatim — no prefix map consulted
    await node(undefined, { id: "http://example.org/t1" }, ctx, {} as never);
    expect(loaded).toEqual(["http://example.org/t1"]);
  });

  it("the singular lookup still expands a prefixed uri, falling back to the raw value", async () => {
    const plan = thingPlan();
    const loaded: string[] = [];
    const ctx = {
      entityLoader: {
        load: async (key: string) => {
          loaded.push(key);
          return null;
        },
      },
    } as unknown as CompilerContext;
    const singular = resolverOf(plan, "thing");
    // registered prefix → expanded (the argument is the one prefixed-form seam)
    await singular(undefined, { uri: "ex:thing" }, ctx, {} as never);
    expect(loaded).toContain("http://example.org/thing");
    // unknown prefix → toFull undefined → `?? args.uri`
    await singular(undefined, { uri: "zz:thing" }, ctx, {} as never);
    expect(loaded).toContain("zz:thing");
  });

  it("the listing paginates and hydrates the loader's IRIs with no conversion", async () => {
    const plan = thingPlan();
    const loaded: string[] = [];
    const ctx = {
      entityLoader: {
        loadMany: async (keys: string[]) => {
          loaded.push(...keys);
          return keys.map(() => null);
        },
      },
      // an IRI with no registered namespace: it must still round-trip intact,
      // because the listing no longer converts at all.
      listLoader: { load: async () => ["urn:unmapped"] },
    } as unknown as CompilerContext;

    const conn = (await resolverOf(plan, "things")(
      undefined,
      {},
      ctx,
      {} as never,
    )) as { edges: unknown[] };
    expect(loaded).toEqual(["urn:unmapped"]);
    expect(conn.edges).toEqual([]);
  });
});
