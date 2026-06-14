import { describe, expect, it } from "vitest";
import { coerce, mapXsdToScalar } from "./coerce.js";

const warnings: Array<{ reason: string }> = [];
const warn = (w: { reason: string }) => warnings.push(w);

describe("coerce", () => {
  it("passes strings through", () => {
    expect(coerce("hello", "String", "p", warn)).toBe("hello");
    expect(coerce("", "String", "p", warn)).toBe("");
  });

  it("coerces boolean lexical forms", () => {
    expect(coerce("true", "Boolean", "p", warn)).toBe(true);
    expect(coerce("false", "Boolean", "p", warn)).toBe(false);
    expect(coerce("1", "Boolean", "p", warn)).toBe(true);
    expect(coerce("0", "Boolean", "p", warn)).toBe(false);
  });

  it("returns null + warning for non-coercible booleans", () => {
    warnings.length = 0;
    expect(coerce("maybe", "Boolean", "p", warn)).toBeNull();
    expect(warnings[0]?.reason).toContain("Boolean");
  });

  it("coerces integers and floats, warning on garbage", () => {
    expect(coerce("42", "Int", "p", warn)).toBe(42);
    expect(coerce("-3", "Int", "p", warn)).toBe(-3);
    expect(coerce("2.5", "Float", "p", warn)).toBe(2.5);
    warnings.length = 0;
    expect(coerce("abc", "Int", "p", warn)).toBeNull();
    expect(coerce("abc", "Float", "p", warn)).toBeNull();
    expect(warnings).toHaveLength(2);
  });
});

describe("mapXsdToScalar", () => {
  const XSD = "http://www.w3.org/2001/XMLSchema#";
  it("maps xsd datatypes to scalars", () => {
    expect(mapXsdToScalar(`${XSD}boolean`)).toBe("Boolean");
    expect(mapXsdToScalar(`${XSD}integer`)).toBe("Int");
    expect(mapXsdToScalar(`${XSD}int`)).toBe("Int");
    expect(mapXsdToScalar(`${XSD}long`)).toBe("Int");
    expect(mapXsdToScalar(`${XSD}float`)).toBe("Float");
    expect(mapXsdToScalar(`${XSD}double`)).toBe("Float");
    expect(mapXsdToScalar(`${XSD}decimal`)).toBe("Float");
    expect(mapXsdToScalar(`${XSD}string`)).toBe("String");
    expect(mapXsdToScalar(`${XSD}anyURI`)).toBe("String");
  });
});
