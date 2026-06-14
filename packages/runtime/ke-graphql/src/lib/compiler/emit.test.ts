import { describe, expect, it } from "vitest";
import type {
  ClassNode,
  EntityValue,
  MappedField,
  MappedInterface,
  MappedIR,
  MappedType,
  MappedUnion,
  NameMap,
  OntologyIR,
  ResolverTemplate,
} from "#shared";
import emit from "./emit.js";

const nameMap: NameMap = {
  toGraphQL: () => undefined,
  toOWL: () => undefined,
  entries: () => [][Symbol.iterator](),
};

const classNode = (
  over: Partial<ClassNode> & Pick<ClassNode, "uri">,
): ClassNode => ({
  label: over.uri,
  namespace: "ex",
  superclasses: [],
  ancestors: [],
  subclasses: [],
  isAbstract: false,
  embeddable: false,
  ownProperties: [],
  allProperties: [],
  ...over,
});

const mappedInterface = (
  over: Partial<MappedInterface> &
    Pick<MappedInterface, "owlUri" | "graphqlName">,
): MappedInterface => ({
  parentInterfaces: [],
  fields: new Map(),
  ...over,
});

const buildMappedWithTypes = (
  types: Map<string, MappedType>,
  classes: Map<string, ClassNode>,
  interfaces: Map<string, MappedInterface>,
  unions: Map<string, MappedUnion>,
): MappedIR =>
  ({
    types,
    interfaces,
    unions,
    nameMap,
    namespaces: new Map(),
    ir: {
      classes,
      properties: new Map(),
      namespaces: new Map(),
      extraction: {} as OntologyIR["extraction"],
    },
  }) as unknown as MappedIR;

const buildMapped = (
  classes: Map<string, ClassNode>,
  interfaces: Map<string, MappedInterface>,
  unions: Map<string, MappedUnion>,
): MappedIR => buildMappedWithTypes(new Map(), classes, interfaces, unions);

const field = (
  template: ResolverTemplate,
  over: Partial<MappedField> = {},
): MappedField => ({
  owlUri: `http://example.org/${template}`,
  graphqlName: template.replace(/-/g, ""),
  type:
    template === "datatype" || template === "datatype-list"
      ? { kind: "scalar", name: "String" }
      : { kind: "type", name: "Thing" },
  nullable: true,
  list: template.endsWith("list"),
  resolverTemplate: template,
  propertyUri: `http://example.org/${template}`,
  shaclRequired: false,
  nonNull: false,
  ...over,
});

const typeWithFields = (fields: Map<string, MappedField>): MappedType => ({
  owlUri: "http://example.org/Thing",
  graphqlName: "Thing",
  interfaces: [],
  fields,
  embeddable: false,
  namespace: "ex",
  pluralName: "things",
  singularName: "thing",
});

describe("emit createResolver", () => {
  it("instantiates a resolver for every template, including inverse and meta", () => {
    const fields = new Map<string, MappedField>();
    for (const template of [
      "datatype",
      "datatype-list",
      "object-singular",
      "object-list",
      "embedded-singular",
      "embedded-list",
      "meta",
    ] as ResolverTemplate[]) {
      fields.set(template, field(template));
    }
    // inverse WITH an explicit inverseOf (left side of the ??)
    fields.set(
      "inverseExplicit",
      field("inverse", {
        graphqlName: "inverseExplicit",
        inverseOf: "http://example.org/forward",
      }),
    );
    // inverse WITHOUT inverseOf → falls back to propertyUri (right side of ??)
    fields.set(
      "inverseFallback",
      field("inverse", {
        graphqlName: "inverseFallback",
        inverseOf: undefined,
      }),
    );

    const types = new Map<string, MappedType>([
      ["Thing", typeWithFields(fields)],
    ]);
    const result = emit(
      buildMappedWithTypes(types, new Map(), new Map(), new Map()),
    );
    const planFields = result.output.types.get("Thing")?.fields;
    expect(planFields?.size).toBe(fields.size);
    for (const name of [
      "datatype",
      "datatypelist",
      "objectsingular",
      "objectlist",
      "embeddedsingular",
      "embeddedlist",
      "inverseExplicit",
      "inverseFallback",
    ]) {
      expect(typeof planFields?.get(name)?.resolve).toBe("function");
    }
    // the meta resolver returns the parent unchanged
    const metaResolve = planFields?.get("meta")?.resolve;
    const parent = { uri: "ex:x", typename: "Thing", triples: new Map() };
    expect(
      metaResolve?.(parent as EntityValue, {}, {} as never, {} as never),
    ).toBe(parent);
  });
});

describe("emit unions", () => {
  it("emits one UnionPlan per mapped union", () => {
    const unions = new Map<string, MappedUnion>([
      ["Shape", { name: "Shape", members: ["Circle", "Square"] }],
    ]);
    const result = emit(buildMapped(new Map(), new Map(), unions));
    expect(result.output.unions.get("Shape")?.members).toEqual([
      "Circle",
      "Square",
    ]);
  });
});

describe("emit areAllImplementorsEmbeddable (cycle-safe walk)", () => {
  it("returns false (non-embeddableOnly) when the interface class is missing from the IR", () => {
    // owlUri has no ClassNode → the walk's root lookup returns undefined.
    const interfaces = new Map([
      [
        "Ghost",
        mappedInterface({
          owlUri: "http://example.org/Ghost",
          graphqlName: "Ghost",
        }),
      ],
    ]);
    const result = emit(buildMapped(new Map(), interfaces, new Map()));
    expect(result.output.interfaces.get("Ghost")?.embeddableOnly).toBe(false);
  });

  it("survives a subClassOf cycle without overflowing the stack", () => {
    // A → B → A self-cycle: the visited-set guard short-circuits the revisit.
    const classes = new Map<string, ClassNode>([
      [
        "http://example.org/A",
        classNode({
          uri: "http://example.org/A",
          isAbstract: true,
          subclasses: ["http://example.org/B"],
        }),
      ],
      [
        "http://example.org/B",
        classNode({
          uri: "http://example.org/B",
          embeddable: true,
          subclasses: ["http://example.org/A"],
        }),
      ],
    ]);
    const interfaces = new Map([
      [
        "A",
        mappedInterface({ owlUri: "http://example.org/A", graphqlName: "A" }),
      ],
    ]);
    const result = emit(buildMapped(classes, interfaces, new Map()));
    // B is the only concrete implementor and it is embeddable → true.
    expect(result.output.interfaces.get("A")?.embeddableOnly).toBe(true);
  });

  it("skips a subclass URI that is absent from the IR", () => {
    // Iface's class lists a subclass that has no ClassNode → walk returns early.
    const classes = new Map<string, ClassNode>([
      [
        "http://example.org/Iface",
        classNode({
          uri: "http://example.org/Iface",
          isAbstract: true,
          subclasses: ["http://example.org/Missing"],
        }),
      ],
    ]);
    const interfaces = new Map([
      [
        "Iface",
        mappedInterface({
          owlUri: "http://example.org/Iface",
          graphqlName: "Iface",
        }),
      ],
    ]);
    const result = emit(buildMapped(classes, interfaces, new Map()));
    // No concrete implementors reachable → not embeddable-only.
    expect(result.output.interfaces.get("Iface")?.embeddableOnly).toBe(false);
  });
});
