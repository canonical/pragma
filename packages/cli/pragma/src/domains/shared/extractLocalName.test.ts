import { describe, expect, it } from "vitest";
import extractLocalName from "./extractLocalName.js";
import { PREFIX_MAP } from "./prefixes.js";

describe("extractLocalName", () => {
  it("extracts after hash", () => {
    expect(extractLocalName("http://example.org/ns#Thing")).toBe("Thing");
  });

  it("extracts after last slash", () => {
    expect(extractLocalName(`${PREFIX_MAP.ds}global`)).toBe("global");
  });

  it("returns full string when no separator", () => {
    expect(extractLocalName("plain")).toBe("plain");
  });

  it("handles nested path", () => {
    expect(extractLocalName(`${PREFIX_MAP.ds}apps/lxd`)).toBe("lxd");
  });
});
