import { describe, expect, it } from "vitest";
import parseAcceptLanguage from "./parseAcceptLanguage.js";

describe("parseAcceptLanguage", () => {
  it("returns an empty array for an empty or missing header", () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("lowercases tags and orders them by descending q-weight", () => {
    expect(parseAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8")).toEqual([
      "fr-ca",
      "fr",
      "en",
    ]);
  });

  it("defaults a tag with no q-weight to 1", () => {
    expect(parseAcceptLanguage("en;q=0.5,de")).toEqual(["de", "en"]);
  });

  it("treats a malformed q-weight as zero", () => {
    expect(parseAcceptLanguage("en;q=x,fr")).toEqual(["fr", "en"]);
  });

  it("drops empty segments", () => {
    expect(parseAcceptLanguage("en,,fr")).toEqual(["en", "fr"]);
  });
});
