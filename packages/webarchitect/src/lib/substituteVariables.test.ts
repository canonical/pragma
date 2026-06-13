import { describe, expect, it } from "vitest";
import type { Schema } from "../types.js";
import substituteVariables from "./substituteVariables.js";

// Reads the resolved package name pattern out of a schema shaped like baseSchema().
function namePattern(schema: Schema): string {
  const rule = schema["package-structure"] as unknown as {
    file: { contains: { properties: { name: { pattern: string } } } };
  };
  return rule.file.contains.properties.name.pattern;
}

describe("substituteVariables", () => {
  const baseSchema = (): Schema => ({
    name: "library",
    variables: {
      prefix: { default: "@canonical/", schema: { type: "string" } },
    },
    "package-structure": {
      file: {
        name: "package.json",
        contains: {
          type: "object",
          properties: {
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal token resolved by substituteVariables
            name: { type: "string", pattern: "^${prefix}" },
          },
        },
      },
    },
  });

  it("substitutes declared defaults when no override is provided", () => {
    expect(namePattern(substituteVariables(baseSchema()))).toBe("^@canonical/");
  });

  it("lets overrides win over declared defaults", () => {
    const result = substituteVariables(baseSchema(), { prefix: "@myorg/" });
    expect(namePattern(result)).toBe("^@myorg/");
  });

  it("treats an empty prefix as no constraint (matches any name)", () => {
    const result = substituteVariables(baseSchema(), { prefix: "" });
    expect(namePattern(result)).toBe("^");
    expect(/^/.test("anything")).toBe(true);
  });

  it("removes the variables block from the resolved schema", () => {
    expect(substituteVariables(baseSchema()).variables).toBeUndefined();
  });

  it("does not mutate the input schema", () => {
    const input = baseSchema();
    substituteVariables(input, { prefix: "@myorg/" });
    // biome-ignore lint/suspicious/noTemplateCurlyInString: asserts the raw token is untouched
    expect(namePattern(input)).toBe("^${prefix}");
  });

  it("throws when an override targets an undeclared variable", () => {
    expect(() => substituteVariables(baseSchema(), { unknown: "x" })).toThrow(
      /Unknown variable 'unknown'/,
    );
  });

  it("throws when an override value fails its declared schema", () => {
    const schema: Schema = {
      name: "test",
      variables: { count: { default: "1", schema: { pattern: "^[0-9]+$" } } },
      rule: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal token resolved by substituteVariables
        file: { name: "package.json", contains: { title: "${count}" } },
      },
    };
    expect(() => substituteVariables(schema, { count: "abc" })).toThrow(
      /Invalid value 'abc' for variable 'count'/,
    );
  });

  it("throws when a rule references an undeclared variable", () => {
    const schema: Schema = {
      name: "test",
      rule: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal token resolved by substituteVariables
        file: { name: "package.json", contains: { title: "${missing}" } },
      },
    };
    expect(() => substituteVariables(schema)).toThrow(
      /Unknown template variable '\$\{missing\}'/,
    );
  });

  it("returns the schema unchanged when there are no variables or tokens", () => {
    const schema: Schema = {
      name: "plain",
      rule: { file: { name: "package.json", contains: { type: "object" } } },
    };
    expect(substituteVariables(schema)).toEqual(schema);
  });
});
