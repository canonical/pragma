import { describe, expect, it } from "vitest";
import describeSchema from "./describeSchema.js";

describe("describeSchema", () => {
  it("returns type description for string type", () => {
    expect(describeSchema({ type: "object" })).toBe("must be object");
  });

  it("returns type description for array type", () => {
    expect(describeSchema({ type: ["string", "number"] })).toBe(
      "must be one of: string, number",
    );
  });

  it("returns const description", () => {
    expect(describeSchema({ const: "module" })).toBe('must equal "module"');
  });

  it("returns pattern description", () => {
    expect(describeSchema({ pattern: "^@canonical/" })).toBe(
      "must match pattern /^@canonical//",
    );
  });

  it("returns required properties description", () => {
    expect(describeSchema({ required: ["name", "version"] })).toBe(
      "must have properties: name, version",
    );
  });

  it("returns properties description for <=3 properties", () => {
    expect(
      describeSchema({
        properties: { name: {}, version: {} },
      }),
    ).toBe("expected properties: name, version");
  });

  it("returns count for >3 properties", () => {
    expect(
      describeSchema({
        properties: { a: {}, b: {}, c: {}, d: {} },
      }),
    ).toBe("validates 4 properties");
  });

  it("ignores non-string non-array type", () => {
    // type as a non-standard value (neither string nor array) — falls through both if/else-if
    expect(describeSchema({ type: 42 } as any)).toBe(
      "validates file content structure",
    );
  });

  it("returns default description for empty schema", () => {
    expect(describeSchema({})).toBe("validates file content structure");
  });

  it("combines multiple descriptions", () => {
    const result = describeSchema({
      type: "object",
      required: ["name"],
      properties: { name: {} },
    });
    expect(result).toBe(
      "must be object, must have properties: name, expected properties: name",
    );
  });
});
