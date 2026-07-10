/**
 * Server-side negotiation and catalog integrity, exercised through the
 * `@canonical/i18n-core` APIs with this app's real configuration — the same
 * calls the dev servers, the compiled renderer, and the client entry make.
 * (Ported from the former app-local `src/lib/i18n` seam.)
 */
import {
  createTranslator,
  directionOf,
  documentAttrs,
  negotiateLocale,
} from "@canonical/i18n-core";
import { describe, expect, it } from "vitest";
import { catalogs } from "./catalogs.js";
import { i18nConfig } from "./config.js";

describe("locale negotiation with the app config", () => {
  it("prefers a supported locale cookie over Accept-Language", () => {
    expect(
      negotiateLocale(i18nConfig, {
        cookieHeader: "theme=dark; locale=fr",
        acceptLanguage: "ar,en;q=0.8",
      }),
    ).toBe("fr");
  });

  it("ignores an unsupported cookie and negotiates the header", () => {
    expect(
      negotiateLocale(i18nConfig, {
        cookieHeader: "locale=pt",
        acceptLanguage: "fr-CA,fr;q=0.9",
      }),
    ).toBe("fr");
  });

  it("matches the base language when only a region tag is offered", () => {
    expect(negotiateLocale(i18nConfig, { acceptLanguage: "ar-EG" })).toBe("ar");
  });

  it("falls back to the default when nothing matches", () => {
    expect(
      negotiateLocale(i18nConfig, { acceptLanguage: "pt-BR,ja;q=0.9" }),
    ).toBe("en");
    expect(negotiateLocale(i18nConfig, {})).toBe("en");
  });
});

describe("document attributes for the app locales", () => {
  it("maps ar to rtl and the rest to ltr", () => {
    expect(documentAttrs(i18nConfig, "ar")).toEqual({
      lang: "ar",
      dir: "rtl",
    });
    expect(directionOf(i18nConfig, "en")).toBe("ltr");
    expect(directionOf(i18nConfig, "fr")).toBe("ltr");
  });
});

describe("message catalogs", () => {
  it("provide the same key set for every configured locale", () => {
    const referenceKeys = Object.keys(catalogs.en).sort();
    for (const locale of i18nConfig.locales) {
      expect(Object.keys(catalogs[locale] ?? {}).sort()).toEqual(referenceKeys);
    }
  });

  it("pluralize the catalog count line per locale", () => {
    const english = createTranslator("en", catalogs.en ?? {});
    expect(english("catalog.showing", { shown: 1, count: 1 })).toBe(
      "— showing 1 of 1 product.",
    );
    expect(english("catalog.showing", { shown: 2, count: 5 })).toBe(
      "— showing 2 of 5 products.",
    );

    // Arabic exercises the richer CLDR categories: 2 → "two", 5 → "few".
    const arabic = createTranslator("ar", catalogs.ar ?? {});
    expect(arabic("catalog.showing", { shown: 2, count: 2 })).toContain(
      "منتجين",
    );
    expect(arabic("catalog.showing", { shown: 4, count: 5 })).toContain(
      "منتجات",
    );
  });

  it("interpolates placeholders", () => {
    const french = createTranslator("fr", catalogs.fr ?? {});
    expect(french("guide.body", { slug: "router-core" })).toBe(
      "Contenu du guide pour router-core.",
    );
  });
});
