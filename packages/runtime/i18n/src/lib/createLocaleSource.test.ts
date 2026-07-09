import { describe, expect, it } from "vitest";
import createLocaleSource from "./createLocaleSource.js";
import type { I18nConfig } from "./types.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

describe("createLocaleSource", () => {
  it("starts at the default locale", () => {
    const source = createLocaleSource(config);
    expect(source.get()).toBe("en");
    expect(source.direction).toBe("ltr");
  });

  it("honors an explicit initial locale and its direction", () => {
    const source = createLocaleSource(config, { initial: "ar" });
    expect(source.get()).toBe("ar");
    expect(source.direction).toBe("rtl");
  });

  it("updates value and direction on set", () => {
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    source.set("ar");
    expect(source.get()).toBe("ar");
    expect(source.direction).toBe("rtl");
  });

  it("notifies subscribers immediately and on change, and unsubscribes", () => {
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const seen: string[] = [];
    const unsubscribe = source.subscribe((locale) => seen.push(locale));

    source.set("fr");
    source.set("fr"); // no-op: same value
    unsubscribe();
    source.set("ar"); // ignored after unsubscribe

    expect(seen).toEqual(["en", "fr"]);
  });

  it("runs persist and reflect effects by default (inert under SSR)", () => {
    const source = createLocaleSource(config);
    expect(() => source.set("fr")).not.toThrow();
    expect(source.get()).toBe("fr");
  });

  it("resolves a configured cookie name", () => {
    const source = createLocaleSource({ ...config, cookieName: "lang" });
    expect(() => source.set("fr")).not.toThrow();
  });
});
