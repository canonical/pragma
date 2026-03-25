import { describe, expect, it } from "vitest";
import compactUri from "./compactUri.js";

describe("compactUri", () => {
  const prefixes = {
    ds: "https://ds.canonical.com/",
    cs: "http://pragma.canonical.com/codestandards#",
  } as const;

  it("compacts a URI when a matching prefix exists", () => {
    expect(
      compactUri("https://ds.canonical.com/global.component.button", prefixes),
    ).toBe("ds:global.component.button");
  });

  it("returns the original URI when no prefix matches", () => {
    expect(compactUri("https://example.com/thing", prefixes)).toBe(
      "https://example.com/thing",
    );
  });
});
