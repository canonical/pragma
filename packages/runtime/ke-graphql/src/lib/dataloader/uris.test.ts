import { describe, expect, it } from "vitest";
import type { NamespaceInfo } from "../compiler/types.js";
import { toFull, toPrefixed } from "./uris.js";

const namespaces = new Map<string, NamespaceInfo>([
  [
    "ds",
    {
      prefix: "ds",
      uri: "https://ds.canonical.com/",
      classCount: 0,
      propertyCount: 0,
    },
  ],
]);

describe("toPrefixed / toFull (KG.10)", () => {
  it("round-trips a prefixed URI", () => {
    const full = "https://ds.canonical.com/global.component.button";
    const prefixed = toPrefixed(full, namespaces);
    expect(prefixed).toBe("ds:global.component.button");
    expect(toFull(prefixed, namespaces)).toBe(full);
  });

  it("returns the input when no namespace matches", () => {
    expect(toPrefixed("http://other.org/x", namespaces)).toBe(
      "http://other.org/x",
    );
  });

  it("returns undefined for unknown prefixes and prefixless ids", () => {
    expect(toFull("zz:thing", namespaces)).toBeUndefined();
    expect(toFull("no-colon-here", namespaces)).toBeUndefined();
  });

  it("passes through full IRIs", () => {
    expect(toFull("https://ds.canonical.com/x", namespaces)).toBe(
      "https://ds.canonical.com/x",
    );
  });
});
