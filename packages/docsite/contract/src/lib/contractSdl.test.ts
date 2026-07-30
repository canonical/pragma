import { existsSync } from "node:fs";
import { assertInterfaceType, buildSchema } from "graphql";
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

  it("carries the four structural Node fields added alongside id/uri", () => {
    const schema = buildSchema(readContractSdl());
    const node = assertInterfaceType(schema.getType("Node"));
    expect(Object.keys(node.getFields())).toEqual([
      "id",
      "uri",
      "kind",
      "label",
      "comment",
      "definition",
    ]);
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
