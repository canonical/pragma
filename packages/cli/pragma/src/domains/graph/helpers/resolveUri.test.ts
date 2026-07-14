import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import resolveUri from "./resolveUri.js";

const prefixes = {
  ds: "https://ds.canonical.com/",
  cs: "http://pragma.canonical.com/codestandards#",
} as const;

describe("resolveUri", () => {
  it("expands a registered prefix", () => {
    expect(resolveUri("ds:UIBlock", prefixes)).toBe(
      "https://ds.canonical.com/UIBlock",
    );
  });

  it("passes through a full http(s) IRI", () => {
    expect(resolveUri("https://ds.canonical.com/global", prefixes)).toBe(
      "https://ds.canonical.com/global",
    );
  });

  it("passes through a urn: IRI", () => {
    expect(resolveUri("urn:isbn:0451450523", prefixes)).toBe(
      "urn:isbn:0451450523",
    );
  });

  it("passes through a foreign scheme:// IRI", () => {
    expect(resolveUri("ftp://example.org/thing", prefixes)).toBe(
      "ftp://example.org/thing",
    );
  });

  it("throws for an unknown prefix", () => {
    expect(() => resolveUri("unknown:something", prefixes)).toThrow(
      PragmaError,
    );
  });

  it("throws for a bare string without a prefix", () => {
    expect(() => resolveUri("button", prefixes)).toThrow(PragmaError);
  });

  it("throws for an IRI with unsafe characters", () => {
    expect(() =>
      resolveUri("https://example.com/<injected>", prefixes),
    ).toThrow(PragmaError);
  });
});
