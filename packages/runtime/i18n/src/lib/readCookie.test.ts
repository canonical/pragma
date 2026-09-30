import { describe, expect, it } from "vitest";
import readCookie from "./readCookie.js";

describe("readCookie", () => {
  it("returns undefined for an empty or missing header", () => {
    expect(readCookie(undefined, "locale")).toBeUndefined();
    expect(readCookie(null, "locale")).toBeUndefined();
    expect(readCookie("", "locale")).toBeUndefined();
  });

  it("reads a value by name and decodes it", () => {
    expect(readCookie("theme=dark; locale=fr-CA", "locale")).toBe("fr-CA");
    expect(readCookie("locale=%D8%B9%D8%B1%D8%A8%D9%8A", "locale")).toBe(
      "عربي",
    );
  });

  it("ignores malformed segments without an '='", () => {
    expect(readCookie("flag; locale=de", "locale")).toBe("de");
  });

  it("returns undefined when the name is absent", () => {
    expect(readCookie("theme=dark", "locale")).toBeUndefined();
  });

  it("returns undefined for malformed percent-encoding", () => {
    expect(readCookie("locale=%E0%A4%A", "locale")).toBeUndefined();
  });
});
