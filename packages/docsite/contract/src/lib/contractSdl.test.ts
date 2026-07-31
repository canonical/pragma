import { existsSync } from "node:fs";
import {
  assertInterfaceType,
  assertObjectType,
  buildSchema,
  GraphQLNonNull,
  type GraphQLScalarType,
} from "graphql";
import { describe, expect, it } from "vitest";
import { CONTRACT_SCHEMA_PATH, readContractSdl } from "./contractSdl.js";

describe("readContractSdl", () => {
  it("points at a file that exists", () => {
    expect(existsSync(CONTRACT_SCHEMA_PATH)).toBe(true);
    expect(CONTRACT_SCHEMA_PATH.endsWith("contract.graphql")).toBe(true);
  });

  it("returns SDL that parses into a valid schema", () => {
    const schema = buildSchema(readContractSdl());
    expect(schema.getQueryType()?.name).toBe("Query");
  });

  it("declares the unconditional structural surface", () => {
    const schema = buildSchema(readContractSdl());
    for (const name of [
      "Node",
      "PageInfo",
      "NodeConnection",
      "NodeEdge",
      "Ontology",
      "OntologyClass",
      "ClassProperty",
      "OntologyProperty",
      "PropertyKind",
      "EntityMeta",
    ]) {
      expect(
        schema.getType(name) ?? null,
        `missing type ${name}`,
      ).not.toBeNull();
    }
  });

  it("keeps Node to identity plus self-description and nothing else", () => {
    const schema = buildSchema(readContractSdl());
    const node = assertInterfaceType(schema.getType("Node"));
    expect(Object.keys(node.getFields())).toEqual(["uri", "_meta"]);
    expect(String(node.getFields().uri?.type)).toBe("ID!");
    expect(String(node.getFields()._meta?.type)).toBe("EntityMeta!");
  });

  it("puts the descriptive quartet behind _meta, each with lang defaulting to en", () => {
    const schema = buildSchema(readContractSdl());
    const meta = assertObjectType(schema.getType("EntityMeta"));
    const fields = meta.getFields();
    // title is total; the other three are asserted-only and nullable.
    expect(String(fields.title?.type)).toBe("String!");
    expect(String(fields.label?.type)).toBe("String");
    expect(String(fields.comment?.type)).toBe("String");
    expect(String(fields.definition?.type)).toBe("String");
    for (const name of ["title", "label", "comment", "definition"]) {
      const lang = fields[name]?.args.find((arg) => arg.name === "lang");
      expect(String(lang?.type), `${name}(lang:)`).toBe("String");
      expect(lang?.defaultValue, `${name}(lang:) default`).toBe("en");
    }
    // ...plus the self-description triple.
    expect(String(fields.type?.type)).toBe("OntologyClass!");
    expect(String(fields.fields?.type)).toBe("[ClassProperty!]!");
    expect(String(fields.field?.type)).toBe("ClassProperty");
  });

  it("makes OntologyClass a Node; OntologyProperty stays a non-Node with ID identity", () => {
    const schema = buildSchema(readContractSdl());
    const ontologyClass = assertObjectType(schema.getType("OntologyClass"));
    expect(ontologyClass.getInterfaces().map((i) => i.name)).toEqual(["Node"]);
    expect(String(ontologyClass.getFields()._meta?.type)).toBe("EntityMeta!");
    // The asymmetry is scope, not principle: the property side has identity
    // (uri: ID!) but no _meta and no Node membership.
    const ontologyProperty = assertObjectType(
      schema.getType("OntologyProperty"),
    );
    expect(ontologyProperty.getInterfaces()).toEqual([]);
    expect(String(ontologyProperty.getFields().uri?.type)).toBe("ID!");
    expect(ontologyProperty.getFields()._meta).toBeUndefined();
  });

  it("exposes the universal root fields and nothing ontology-specific", () => {
    const schema = buildSchema(readContractSdl());
    const query = schema.getQueryType();
    expect(Object.keys(query?.getFields() ?? {})).toEqual([
      "node",
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
    ]);
  });

  it("takes String!, not ID!, for the TBox convenience lookups", () => {
    // RULING PIN: ontologyClass(uri:)/ontologyProperty(uri:) accept the
    // PREFIXED form and live client operations declare `$uri: String!`.
    // Promoting the argument to ID! would invalidate them. node(id:) is the
    // strict lookup and stays ID!.
    const schema = buildSchema(readContractSdl());
    const fields = schema.getQueryType()?.getFields() ?? {};
    for (const name of ["ontologyClass", "ontologyProperty"]) {
      const arg = fields[name]?.args.find((a) => a.name === "uri");
      const argType = arg?.type;
      expect(argType, `${name}(uri:)`).toBeInstanceOf(GraphQLNonNull);
      const inner = (argType as GraphQLNonNull<GraphQLScalarType>).ofType;
      expect(inner.name, `${name}(uri:)`).toBe("String");
    }
    const nodeArg = fields.node?.args.find((a) => a.name === "id");
    expect(String(nodeArg?.type)).toBe("ID!");
  });

  it("omits the incremental-delivery directives", () => {
    const schema = buildSchema(readContractSdl());
    expect(schema.getDirective("defer") ?? null).toBeNull();
    expect(schema.getDirective("stream") ?? null).toBeNull();
  });

  it("omits ontology-derived types and provider extension fields", () => {
    const schema = buildSchema(readContractSdl());
    for (const name of ["Component", "Job", "CodeStandard", "Lens"]) {
      expect(
        schema.getType(name) ?? null,
        `unexpected type ${name}`,
      ).toBeNull();
    }
    // acceptanceCriteria/completionGuidance are annotation-derived provider
    // extensions — deliberately absent from the base.
    const property = assertObjectType(schema.getType("OntologyProperty"));
    expect(property.getFields().acceptanceCriteria).toBeUndefined();
    expect(property.getFields().completionGuidance).toBeUndefined();
  });
});
