import { existsSync } from "node:fs";
import { assertInterfaceType, assertObjectType, buildSchema } from "graphql";
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

  it("carries exactly the two structural Node fields", () => {
    // `uri` is the primary key and everything conventional lives behind
    // `_meta`, so a null under `_meta` (the convention matched nothing) is
    // distinguishable from a null above it (the graph asserts nothing).
    // `id` and `kind` are gone: consumers discriminate on `_meta.type.uri`.
    const schema = buildSchema(readContractSdl());
    const node = assertInterfaceType(schema.getType("Node"));
    expect(Object.keys(node.getFields())).toEqual(["uri", "_meta"]);
    expect(String(node.getFields().uri?.type)).toBe("ID!");
  });

  it("puts the descriptive surface on EntityMeta, without the lang argument", () => {
    // Declared argument-free ON PURPOSE: adding an optional argument is a
    // DANGEROUS change, not a breaking one, and the predicate ignores
    // dangerous. So a provider whose fields carry `lang` still satisfies this,
    // while a contract that demanded `lang` would reject one that lacks it.
    // Argument-free is the wider floor.
    const schema = buildSchema(readContractSdl());
    const meta = assertObjectType(schema.getType("EntityMeta"));
    const fields = meta.getFields();
    expect(String(fields.title?.type)).toBe("String!");
    expect(String(fields.label?.type)).toBe("String");
    expect(fields.title?.args).toHaveLength(0);
    expect(fields.label?.args).toHaveLength(0);
  });

  it("exposes the universal root fields and nothing ontology-specific", () => {
    const schema = buildSchema(readContractSdl());
    const query = schema.getQueryType();
    expect(Object.keys(query?.getFields() ?? {})).toEqual([
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
      "node",
    ]);
  });

  it("omits the incremental-delivery directives", () => {
    const schema = buildSchema(readContractSdl());
    expect(schema.getDirective("defer") ?? null).toBeNull();
    expect(schema.getDirective("stream") ?? null).toBeNull();
  });

  it("omits ontology-derived types", () => {
    const schema = buildSchema(readContractSdl());
    for (const name of ["Component", "Job", "CodeStandard", "Lens"]) {
      expect(
        schema.getType(name) ?? null,
        `unexpected type ${name}`,
      ).toBeNull();
    }
  });
});
