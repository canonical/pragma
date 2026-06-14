import { describe, expect, it } from "vitest";
import {
  dirForLocale,
  isSupportedLocale,
  negotiateLocale,
  parseAcceptLanguage,
} from "./negotiateLocale.js";

describe("isSupportedLocale", () => {
  it("accepts supported tags and rejects everything else", () => {
    expect(isSupportedLocale("fr")).toBe(true);
    expect(isSupportedLocale("ar")).toBe(true);
    expect(isSupportedLocale("pt")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe("dirForLocale", () => {
  it("maps RTL base languages to rtl and the rest to ltr", () => {
    expect(dirForLocale("ar")).toBe("rtl");
    expect(dirForLocale("ar-EG")).toBe("rtl");
    expect(dirForLocale("en")).toBe("ltr");
    expect(dirForLocale("fr-CA")).toBe("ltr");
    expect(dirForLocale(undefined)).toBe("ltr");
  });
});

describe("parseAcceptLanguage", () => {
  it("orders tags by descending q-weight", () => {
    expect(parseAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8")).toEqual([
      "fr-ca",
      "fr",
      "en",
    ]);
  });

  it("treats a missing q as weight 1", () => {
    expect(parseAcceptLanguage("en;q=0.5,de")).toEqual(["de", "en"]);
  });

  it("returns an empty list for null or empty headers", () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });
});

describe("negotiateLocale", () => {
  it("prefers a valid locale cookie over Accept-Language", () => {
    expect(negotiateLocale("theme=dark; locale=de", "fr,en")).toBe("de");
  });

  it("ignores an unsupported cookie and negotiates the header", () => {
    expect(negotiateLocale("locale=pt", "fr-CA,fr;q=0.9")).toBe("fr");
  });

  it("matches the base language when only a region tag is offered", () => {
    expect(negotiateLocale(null, "es-419,es;q=0.9")).toBe("es");
  });

  it("falls back to the default when nothing matches", () => {
    expect(negotiateLocale(null, "pt-BR,ja;q=0.9")).toBe("en");
    expect(negotiateLocale(null, null)).toBe("en");
  });
});
