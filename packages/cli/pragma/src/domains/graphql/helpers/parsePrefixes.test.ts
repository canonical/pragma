import { describe, expect, it } from "vitest";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import parsePrefixes from "./parsePrefixes.js";

describe("parsePrefixes", () => {
  it("returns the default prefix map for no entries", () => {
    const prefixes = parsePrefixes([]);
    expect(prefixes).toEqual(PREFIX_MAP);
  });

  it("merges entries on top of the defaults", () => {
    const prefixes = parsePrefixes(["ex=http://example.org/"]);
    expect(prefixes.ex).toBe("http://example.org/");
    expect(prefixes.ds).toBe(PREFIX_MAP.ds);
  });

  it("lets entries override default prefixes", () => {
    const prefixes = parsePrefixes(["ds=http://other.example/"]);
    expect(prefixes.ds).toBe("http://other.example/");
  });

  it("splits on the first equals sign only", () => {
    const prefixes = parsePrefixes(["ex=http://example.org/?q=1"]);
    expect(prefixes.ex).toBe("http://example.org/?q=1");
  });

  it("throws structured error for an entry without equals sign", () => {
    expect(() => parsePrefixes(["nonsense"])).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("throws structured error for an entry without a name", () => {
    expect(() => parsePrefixes(["=http://example.org/"])).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("throws structured error for an entry without a namespace", () => {
    expect(() => parsePrefixes(["ex="])).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });
});
