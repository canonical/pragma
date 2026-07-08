import { GraphQLString } from "graphql";
import { describe, expect, it } from "vitest";
import type {
  InterfacePlan,
  MappedIR,
  NameMap,
  TypePlan,
} from "../shared/index.js";
import compose from "./compose.js";
import type { FieldPlan, SchemaPlan } from "./emit.js";
import type { SchemaExtensionsInput } from "./types.js";

const nameMap: NameMap = {
  toGraphQL: () => undefined,
  toOWL: () => undefined,
  entries: () => [][Symbol.iterator](),
};

// Minimal MappedIR: buildTBoxSchema reads `ir` only inside resolver thunks,
// none of which run during composition.
const mapped = {
  types: new Map(),
  interfaces: new Map(),
  unions: new Map(),
  nameMap,
  namespaces: new Map(),
  ir: {
    classes: new Map(),
    properties: new Map(),
    namespaces: new Map(),
    extraction: {} as MappedIR["ir"]["extraction"],
  },
} as unknown as MappedIR;

const emptyPlan = (over: Partial<SchemaPlan> = {}): SchemaPlan => ({
  types: new Map(),
  interfaces: new Map(),
  unions: new Map(),
  queryFields: new Map(),
  mapped,
  ...over,
});

const objectPlan = (name: string, fields: TypePlan["fields"]): TypePlan => ({
  name,
  interfaces: [],
  fields,
  embeddable: false,
});

const interfacePlan = (name: string): InterfacePlan => ({
  name,
  parents: [],
  fields: new Map(),
  embeddableOnly: false,
});

describe("compose validation failures (C003)", () => {
  it("reports a validateSchema error and nulls the schema", () => {
    // An object type with zero fields fails validateSchema ("must define one
    // or more fields") without throwing during construction.
    const plan = emptyPlan({
      types: new Map([["Empty", objectPlan("Empty", new Map())]]),
    });
    const { output, diagnostics } = compose(plan);
    expect(output.schema).toBeNull();
    expect(output.sdl).toBe("");
    const c003 = diagnostics.filter((d) => d.code === "C003");
    expect(c003.length).toBeGreaterThan(0);
    expect(c003[0]?.severity).toBe("error");
    expect(c003.some((d) => /Empty/.test(d.message))).toBe(true);
  });

  it("skipValidation leaves the (unvalidated) schema and empty SDL", () => {
    const plan = emptyPlan({
      types: new Map([["Empty", objectPlan("Empty", new Map())]]),
    });
    const { output, diagnostics } = compose(plan, { skipValidation: true });
    // No validation ran: the schema object is kept, SDL is not printed.
    expect(output.schema).not.toBeNull();
    expect(output.sdl).toBe("");
    expect(diagnostics.filter((d) => d.code === "C003")).toHaveLength(0);
  });

  it("catches a thrown schema-construction error as C003", () => {
    // A generated interface and a generated object type sharing a name make
    // the GraphQLSchema constructor throw ("multiple types named …"); the
    // throw is caught and surfaced as C003 with a null schema.
    const plan = emptyPlan({
      types: new Map([
        [
          "Dup",
          objectPlan(
            "Dup",
            new Map([
              [
                "field",
                {
                  name: "field",
                  type: {
                    base: "String",
                    kind: "scalar",
                    list: false,
                    nonNull: false,
                  },
                },
              ],
            ]),
          ),
        ],
      ]),
      interfaces: new Map([["Dup", interfacePlan("Dup")]]),
    });
    const { output, diagnostics } = compose(plan);
    expect(output.schema).toBeNull();
    const c003 = diagnostics.filter((d) => d.code === "C003");
    expect(c003.length).toBeGreaterThan(0);
    expect(c003.some((d) => /Dup/.test(d.message))).toBe(true);
  });
});

const scalarField = (name: string, nonNull = false): FieldPlan => ({
  name,
  type: { base: "String", kind: "scalar", list: false, nonNull },
});

describe("compose full construction", () => {
  it("builds unions, connections, args, and merges extensions", () => {
    // ── interface Named { name: String } ──
    const named: InterfacePlan = {
      name: "Named",
      parents: [],
      fields: new Map([["name", scalarField("name")]]),
      embeddableOnly: false,
    };

    // ── type Thing implements Named ──
    const thingFields = new Map<string, FieldPlan>([
      ["name", scalarField("name")],
      // base resolves to no known type → findNamedType returns undefined and
      // the type falls back to String (the ?? GraphQLString branch).
      [
        "mystery",
        {
          name: "mystery",
          type: { base: "Missing", kind: "named", list: false, nonNull: false },
        },
      ],
      // a connection whose base is also unknown → the edge node type uses the
      // same String fallback inside getConnectionType.
      [
        "links",
        {
          name: "links",
          type: {
            base: "Missing",
            kind: "connection",
            list: false,
            nonNull: true,
          },
          connectionArgs: true,
        },
      ],
      // static args: one required, one optional, plus a bogus scalar type that
      // exercises the SCALARS[...] ?? GraphQLString fallback.
      [
        "lookup",
        {
          name: "lookup",
          type: { base: "String", kind: "scalar", list: false, nonNull: false },
          args: {
            id: { type: "ID", required: true },
            q: { type: "String", required: false },
            weird: { type: "Decimal" as "String", required: false },
          },
        },
      ],
    ]);
    const thing: TypePlan = {
      name: "Thing",
      interfaces: ["Named"],
      fields: thingFields,
      embeddable: false,
    };

    // ── union Shape = Thing ──
    const plan: SchemaPlan = emptyPlan({
      types: new Map([["Thing", thing]]),
      interfaces: new Map([["Named", named]]),
      unions: new Map([["Shape", { name: "Shape", members: ["Thing"] }]]),
      queryFields: new Map<string, FieldPlan>([
        [
          "thing",
          {
            name: "thing",
            type: { base: "Thing", kind: "named", list: false, nonNull: false },
          },
        ],
        [
          "shape",
          {
            name: "shape",
            type: { base: "Shape", kind: "named", list: false, nonNull: false },
          },
        ],
      ]),
    });

    const ifaceSeen: Array<string | undefined> = [];
    const extensions: SchemaExtensionsInput = (types) => {
      // exercise the factory-form lookups: a generated interface, Node, and a
      // miss (the iface ?? Node ?? undefined chain), plus a type lookup.
      ifaceSeen.push(types.iface("Named")?.name);
      ifaceSeen.push(types.iface("Node")?.name);
      ifaceSeen.push(types.iface("Nope")?.name);
      types.type("Thing");
      return {
        Thing: {
          extra: { type: GraphQLString }, // new → merged
          name: { type: GraphQLString }, // conflicts → C002
        },
        Query: {
          newRoot: { type: GraphQLString }, // new → merged
          thing: { type: GraphQLString }, // conflicts → C002
        },
      };
    };

    const { output, diagnostics } = compose(plan, { extensions });
    expect(output.schema).not.toBeNull();
    expect(output.sdl).toContain("union Shape = Thing");
    expect(output.sdl).toContain("type Thing implements Named");
    // connection + edge synthesized for the unknown base
    expect(output.sdl).toContain("MissingConnection");

    // factory lookups resolved as expected
    expect(ifaceSeen).toEqual(["Named", "Node", undefined]);

    // both conflicts surfaced; both new fields merged in
    const c002 = diagnostics.filter((d) => d.code === "C002");
    expect(c002.map((d) => d.message).sort()).toEqual([
      "extension field Query.thing conflicts with a generated field",
      "extension field Thing.name conflicts with a generated field",
    ]);
    expect(output.sdl).toContain("extra: String");
    expect(output.sdl).toContain("newRoot: String");
    // no C001: every extended type exists
    expect(diagnostics.filter((d) => d.code === "C001")).toHaveLength(0);
  });

  it("surfaces a C002 extension conflict even under skipValidation", () => {
    // The artifact-boot fast path skips validateSchema (which normally triggers
    // the field thunks where conflicts are detected), but an extension field
    // colliding with a generated one is still fatal and must surface.
    const plan = emptyPlan({
      types: new Map([
        [
          "Thing",
          objectPlan("Thing", new Map([["name", scalarField("name")]])),
        ],
      ]),
    });
    const extensions: SchemaExtensionsInput = {
      Thing: { name: { type: GraphQLString } },
    };
    const { diagnostics } = compose(plan, {
      extensions,
      skipValidation: true,
    });
    expect(
      diagnostics.filter((d) => d.code === "C002").map((d) => d.message),
    ).toContain("extension field Thing.name conflicts with a generated field");
  });

  it("C001 — object-form extension references an unknown type", () => {
    const thing: TypePlan = {
      name: "Thing",
      interfaces: [],
      fields: new Map([["name", scalarField("name")]]),
      embeddable: false,
    };
    const extensions: SchemaExtensionsInput = {
      Ghost: { extra: { type: GraphQLString } },
    };
    const { output, diagnostics } = compose(
      emptyPlan({ types: new Map([["Thing", thing]]) }),
      { extensions },
    );
    expect(output.schema).not.toBeNull();
    expect(diagnostics.filter((d) => d.code === "C001")).toHaveLength(1);
    expect(diagnostics.find((d) => d.code === "C001")?.message).toContain(
      "Ghost",
    );
  });
});
