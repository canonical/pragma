import {
  createLocaleSource,
  type I18nConfig,
  type Locale,
  type Messages,
} from "@canonical/i18n-core";
import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import createI18n from "./createI18n.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = {
  en: { greeting: "Hello, {name}!" },
  fr: { greeting: "Bonjour, {name} !" },
};

describe("createI18n", () => {
  it("exposes locale, direction, translator, and formatters as stores", () => {
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const i18n = createI18n(source, catalogs);

    expect(get(i18n.locale)).toBe("en");
    expect(get(i18n.direction)).toBe("ltr");
    expect(get(i18n.t)("greeting", { name: "Ada" })).toBe("Hello, Ada!");
    expect(get(i18n.formatters).number(1234.5)).toBe("1,234.5");
  });

  it("refreshes derived stores when the locale changes", () => {
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const i18n = createI18n(source, catalogs);

    i18n.setLocale("fr");
    expect(get(i18n.locale)).toBe("fr");
    expect(get(i18n.t)("greeting", { name: "Ada" })).toBe("Bonjour, Ada !");

    i18n.setLocale("ar");
    expect(get(i18n.direction)).toBe("rtl");
    expect(get(i18n.t)("greeting")).toBe("greeting"); // ar has no catalog
  });
});
