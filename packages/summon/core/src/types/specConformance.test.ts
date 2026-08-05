/**
 * PROTECTED — the generator-definition spec and the TypeScript declarations
 * cannot drift apart.
 *
 * `spec/generator-definition.v1.json` is summon's DOMAIN spec: the written form
 * of the shape a generator package must supply. A document nobody checks is a
 * document that goes stale, so this reads the declaration files THEMSELVES and
 * compares field-for-field in BOTH directions — a field added to the interface
 * with no entry in the spec fails, and an entry in the spec naming no field
 * fails too.
 *
 * It reads SOURCE TEXT rather than a runtime value because these are interfaces
 * and interfaces are erased. That is a real limitation: it sees what is
 * declared, not what any implementation does. The second describe below closes
 * half of it by holding a REAL generator — the conformance fixture — to the
 * same required sets, so a spec that describes a shape nothing can satisfy
 * fails as well.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { conformanceGenerator } from "../testing/conformance/conformanceGenerator.js";

/** One type's entry in the spec document. */
interface SpecType {
  readonly description: string;
  readonly fields: Record<
    string,
    { readonly required: boolean; readonly description: string }
  >;
}

const spec = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../spec/generator-definition.v1.json", import.meta.url),
    ),
    "utf-8",
  ),
) as { specVersion: number; types: Record<string, SpecType> };

/**
 * Read the members an interface declares, from its source text.
 *
 * Comments are stripped first so a field name inside a docblock cannot be
 * mistaken for a declaration — every member in these files carries one, so
 * without the strip the extraction would be dominated by prose.
 *
 * @param source - The module's source text.
 * @returns Member name → whether it is optional, in declaration order.
 * @note Impure only in that it reads text the caller loaded; the parse is pure.
 */
function readDeclaredMembers(source: string): Map<string, boolean> {
  const body = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const start = body.indexOf("{", body.indexOf("interface "));
  const members = new Map<string, boolean>();
  for (const match of body.slice(start).matchAll(/^\s{2}(\w+)(\?)?\s*[:(]/gm)) {
    const name = match[1];
    if (name === undefined) continue;
    members.set(name, match[2] === "?");
  }
  return members;
}

/** Load one declaration module's members by file name. */
function loadMembers(fileName: string): Map<string, boolean> {
  return readDeclaredMembers(
    readFileSync(fileURLToPath(new URL(fileName, import.meta.url)), "utf-8"),
  );
}

const DECLARATIONS: Record<string, string> = {
  GeneratorDefinition: "./GeneratorDefinition.ts",
  GeneratorMeta: "./GeneratorMeta.ts",
  PromptDefinition: "./PromptDefinition.ts",
};

describe("generator-definition spec conformance (PROTECTED)", () => {
  it("describes exactly the three types the declarations define", () => {
    expect(Object.keys(spec.types).sort()).toEqual(
      Object.keys(DECLARATIONS).sort(),
    );
    expect(spec.specVersion).toBe(1);
  });

  it.each(
    Object.keys(DECLARATIONS),
  )("%s: the spec's field set is the declaration's field set", (typeName) => {
    const fileName = DECLARATIONS[typeName];
    expect(fileName).toBeDefined();
    const declared = loadMembers(fileName ?? "");
    const described = spec.types[typeName]?.fields ?? {};
    expect([...declared.keys()].sort()).toEqual(Object.keys(described).sort());
  });

  it.each(
    Object.keys(DECLARATIONS),
  )("%s: the spec agrees with the declaration about what is REQUIRED", (typeName) => {
    const declared = loadMembers(DECLARATIONS[typeName] ?? "");
    const described = spec.types[typeName]?.fields ?? {};
    for (const [field, optional] of declared) {
      expect(described[field]?.required, `${typeName}.${field}`).toBe(
        !optional,
      );
    }
  });

  it("every described field carries a reason a reader can use", () => {
    for (const [typeName, type] of Object.entries(spec.types)) {
      expect(type.description.length, typeName).toBeGreaterThan(20);
      for (const [field, entry] of Object.entries(type.fields)) {
        expect(
          entry.description.length,
          `${typeName}.${field}`,
        ).toBeGreaterThan(20);
      }
    }
  });

  it("says, in its own words, that it is NOT the cross-tool shared contract", () => {
    // The one clause the document exists to carry. A spec that stated a shape
    // without stating its scope would be read as the shared contract by the
    // next person who found it, which is exactly the inference the separate
    // extraction programme cannot afford.
    const comment = (spec as unknown as { $comment: string }).$comment;
    expect(comment).toContain("NOT THE CROSS-TOOL SHARED CONTRACT");
    expect(comment).toContain("separate programme");
  });
});

describe("a real generator satisfies the spec's required sets", () => {
  it("the conformance fixture carries every required field, and no unknown one", () => {
    const definitionFields = spec.types.GeneratorDefinition?.fields ?? {};
    const metaFields = spec.types.GeneratorMeta?.fields ?? {};
    const promptFields = spec.types.PromptDefinition?.fields ?? {};

    const requiredOf = (fields: Record<string, { required: boolean }>) =>
      Object.entries(fields)
        .filter(([, entry]) => entry.required)
        .map(([name]) => name);

    for (const field of requiredOf(definitionFields)) {
      expect(conformanceGenerator, field).toHaveProperty(field);
    }
    for (const field of requiredOf(metaFields)) {
      expect(conformanceGenerator.meta, field).toHaveProperty(field);
    }
    for (const prompt of conformanceGenerator.prompts) {
      for (const field of requiredOf(promptFields)) {
        expect(prompt, `${prompt.name}.${field}`).toHaveProperty(field);
      }
      for (const key of Object.keys(prompt)) {
        expect(Object.keys(promptFields), `${prompt.name}.${key}`).toContain(
          key,
        );
      }
    }
    for (const key of Object.keys(conformanceGenerator.meta)) {
      expect(Object.keys(metaFields), `meta.${key}`).toContain(key);
    }
  });
});
