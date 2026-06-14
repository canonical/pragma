import { describe, expect, it } from "vitest";
import negotiateLocale from "./negotiateLocale.js";
import type { I18nConfig } from "./types.js";

const config: I18nConfig = { locales: ["en", "fr", "ar"], defaultLocale: "en" };

describe("negotiateLocale", () => {
  it("prefers a supported locale cookie above all else", () => {
    expect(
      negotiateLocale(config, {
        cookieHeader: "locale=fr",
        acceptLanguage: "ar",
      }),
    ).toBe("fr");
  });

  it("ignores an unsupported cookie and falls back to Accept-Language", () => {
    expect(
      negotiateLocale(config, {
        cookieHeader: "locale=de",
        acceptLanguage: "ar;q=0.9,en;q=0.1",
      }),
    ).toBe("ar");
  });

  it("matches the base language when only a regional tag is requested", () => {
    expect(negotiateLocale(config, { acceptLanguage: "fr-CA,fr;q=0.9" })).toBe(
      "fr",
    );
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(negotiateLocale(config, { acceptLanguage: "de,es" })).toBe("en");
  });

  it("negotiates case-insensitively and returns the configured casing", () => {
    const cased: I18nConfig = { locales: ["en", "fr-CA"], defaultLocale: "en" };
    expect(negotiateLocale(cased, { acceptLanguage: "fr-CA,en;q=0.5" })).toBe(
      "fr-CA",
    );
    expect(negotiateLocale(cased, { acceptLanguage: "fr-FR" })).toBe("en");
  });

  it("uses a custom cookie name from config", () => {
    const custom: I18nConfig = { ...config, cookieName: "lang" };
    expect(negotiateLocale(custom, { cookieHeader: "lang=ar" })).toBe("ar");
  });

  it("defaults sources to empty, returning the default locale", () => {
    expect(negotiateLocale(config)).toBe("en");
  });
});
