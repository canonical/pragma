import type { GraphQLFieldResolver } from "graphql";
import { describe, expect, it } from "vitest";
import type {
  CompilerContext,
  EntityValue,
  InterfacePlan,
  MappedIR,
  MappedType,
  NameMap,
  NamespaceInfo,
  TypePlan,
} from "../shared/index.js";
import type { FieldPlan, SchemaPlan } from "./emit.js";
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
  it("skips embeddable-only interfaces but wires concrete ones", () => {
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
    // embeddable-only interface: no structural fields, no Node parent
    expect(plan.interfaces.get("EmbOnly")?.fields.has("id")).toBe(false);
    expect(plan.interfaces.get("EmbOnly")?.parents).not.toContain("Node");
    // concrete interface: id/uri/_meta injected, Node added
    expect(plan.interfaces.get("Concrete")?.fields.has("id")).toBe(true);
    expect(plan.interfaces.get("Concrete")?.parents).toContain("Node");
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

  it("singular and listing resolvers fall back to the raw URI on an unknown prefix", async () => {
    const plan = thingPlan();
    const loaded: string[] = [];
    const ctx = {
      entityLoader: {
        load: async (key: string) => {
          loaded.push(key);
          return null;
        },
        loadMany: async (keys: string[]) => {
          loaded.push(...keys);
          return keys.map(() => null);
        },
      },
      // a URI with no registered namespace: toPrefixed leaves it unchanged and
      // the subsequent toFull cannot expand it → the `?? uri` fallback fires.
      listLoader: { load: async () => ["urn:unmapped"] },
    } as unknown as CompilerContext;

    // unknown prefix → toFull undefined → singular uses `?? args.uri`
    await resolverOf(plan, "thing")(
      undefined,
      { uri: "zz:thing" },
      ctx,
      {} as never,
    );
    expect(loaded).toContain("zz:thing");

    // listing → toFull undefined per window URI → `?? uri` fallback
    const conn = (await resolverOf(plan, "things")(
      undefined,
      {},
      ctx,
      {} as never,
    )) as { edges: unknown[] };
    expect(loaded).toContain("urn:unmapped");
    expect(conn.edges).toEqual([]);
  });
});
