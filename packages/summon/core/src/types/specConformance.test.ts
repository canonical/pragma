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
    {
      readonly required: boolean;
      readonly description: string;
      readonly values?: readonly string[];
    }
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
 * Both capture groups are read with `.at`: group 2 is `(\?)?`, genuinely
 * absent on a required member. This package's tsconfig does not set
 * `noUncheckedIndexedAccess`, so `match[2]` would type as `string` while
 * being `undefined` at runtime, and the fallibility would be invisible.
 *
 * @param source - The module's source text.
 * @returns Member name → whether it is optional, in declaration order.
 */
function readDeclaredMembers(source: string): Map<string, boolean> {
  const body = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const start = body.indexOf("{", body.indexOf("interface "));
  const members = new Map<string, boolean>();
  for (const match of body.slice(start).matchAll(/^\s{2}(\w+)(\?)?\s*[:(]/gm)) {
    const name = match.at(1);
    if (name === undefined) continue;
    members.set(name, match.at(2) === "?");
  }
  return members;
}

/**
 * Read the string-literal union one member declares, from its source text.
 *
 * The same strip-then-match pass as {@link readDeclaredMembers}, narrowed to
 * one member's type position. It exists because a `values` array in the spec
 * document is the one part of that document nothing else checks: the field-name
 * and required-flag passes below never look at it, so an enumeration could
 * describe four cases while the interface admitted five.
 *
 * @param source - The module's source text.
 * @param member - The member whose type position to read.
 * @returns The quoted literals of that union, in declaration order.
 * @throws Error when the member declares no type position at all.
 */
function readDeclaredUnion(source: string, member: string): readonly string[] {
  const body = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const declaration = new RegExp(`^\\s{2}${member}\\??\\s*:([^;]*);`, "m").exec(
    body,
  );
  const position = declaration?.at(1);
  if (position === undefined) {
    throw new Error(`the declaration has no member "${member}"`);
  }
  return [...position.matchAll(/"([^"]*)"/g)].flatMap((match) => {
    const literal = match.at(1);
    return literal === undefined ? [] : [literal];
  });
}

/**
 * Load one declaration module's members by file name.
 *
 * @param fileName - The declaration module, relative to this file.
 * @returns Member name → whether it is optional, in declaration order.
 * @note Impure — reads the declaration file from disk.
 */
function loadMembers(fileName: string): Map<string, boolean> {
  return readDeclaredMembers(loadDeclarationSource(fileName));
}

/**
 * Read one declaration module's source text.
 *
 * @param fileName - The declaration module, relative to this file.
 * @returns The file's text.
 * @note Impure — reads the declaration file from disk.
 */
function loadDeclarationSource(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(fileName, import.meta.url)),
    "utf-8",
  );
}

const DECLARATIONS: Record<string, string> = {
  GeneratorDefinition: "./GeneratorDefinition.ts",
  GeneratorMeta: "./GeneratorMeta.ts",
  PromptDefinition: "./PromptDefinition.ts",
};

/**
 * The spec document's entry for one type, or a throw naming the missing type.
 *
 * Deliberately not a `?? {}` fallback: an empty field set AGREES with a
 * declaration that declares nothing, so a spec that lost a type would be read
 * as a spec that describes an empty one. The first case below pins the two key
 * sets equal, so reaching this throw means that case is already red — and this
 * one then says which type it was rather than failing on an empty comparison.
 *
 * @param typeName - The type as `DECLARATIONS` keys it.
 * @returns The spec's entry for that type.
 * @throws Error naming the type the spec document does not describe.
 */
function readSpecType(typeName: string): SpecType {
  const type = spec.types[typeName];
  if (type === undefined) {
    throw new Error(`the spec document describes no type "${typeName}"`);
  }
  return type;
}

describe("generator-definition spec conformance (PROTECTED)", () => {
  it("describes exactly the three types the declarations define", () => {
    expect(Object.keys(spec.types).sort()).toEqual(
      Object.keys(DECLARATIONS).sort(),
    );
    expect(spec.specVersion).toBe(1);
  });

  // Driven over ENTRIES, so the declaration file is bound rather than looked
  // up: a `?? ""` on the lookup would resolve `new URL("", import.meta.url)` to
  // this test file and parse its own text into a plausible-looking member set.
  it.each(
    Object.entries(DECLARATIONS),
  )("%s: the spec's field set is the declaration's field set", (typeName, fileName) => {
    const declared = loadMembers(fileName);
    const described = readSpecType(typeName).fields;
    expect([...declared.keys()].sort()).toEqual(Object.keys(described).sort());
  });

  it.each(
    Object.entries(DECLARATIONS),
  )("%s: the spec agrees with the declaration about what is REQUIRED", (typeName, fileName) => {
    const declared = loadMembers(fileName);
    const described = readSpecType(typeName).fields;
    for (const [field, optional] of declared) {
      expect(described[field]?.required, `${typeName}.${field}`).toBe(
        !optional,
      );
    }
  });

  it("pins its one enumeration to the union the declaration admits", () => {
    // `PromptDefinition.type` is the only field the spec describes with a
    // machine-readable `values` array. Without this the array is prose: a fifth
    // prompt type added to the interface would leave the document claiming four
    // and every other case green.
    const described = readSpecType("PromptDefinition").fields.type;
    const declared = readDeclaredUnion(
      loadDeclarationSource("./PromptDefinition.ts"),
      "type",
    );
    expect(declared.length).toBeGreaterThan(1);
    expect(described?.values).toEqual(declared);
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
    const definitionFields = readSpecType("GeneratorDefinition").fields;
    const metaFields = readSpecType("GeneratorMeta").fields;
    const promptFields = readSpecType("PromptDefinition").fields;

    const listRequiredFields = (
      fields: Record<string, { required: boolean }>,
    ) =>
      Object.entries(fields)
        .filter(([, entry]) => entry.required)
        .map(([name]) => name);

    for (const field of listRequiredFields(definitionFields)) {
      expect(conformanceGenerator, field).toHaveProperty(field);
    }
    for (const field of listRequiredFields(metaFields)) {
      expect(conformanceGenerator.meta, field).toHaveProperty(field);
    }
    for (const prompt of conformanceGenerator.prompts) {
      for (const field of listRequiredFields(promptFields)) {
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
