import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import I18nProvider from "../I18nProvider/Provider.js";
import useLocale from "./useLocale.js";
import useTranslation from "./useTranslation.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = {
  en: { greeting: "Hello, {name}!" },
  fr: { greeting: "Bonjour, {name} !" },
};

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <I18nProvider config={config} catalogs={catalogs}>
      {children}
    </I18nProvider>
  );
}

describe("useTranslation", () => {
  it("translates for the active locale", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("greeting", { name: "Ada" })).toBe("Hello, Ada!");
    expect(result.current.locale).toBe("en");
    expect(result.current.direction).toBe("ltr");
  });

  it("re-translates when the locale changes", () => {
    const { result } = renderHook(
      () => ({ translation: useTranslation(), locale: useLocale() }),
      { wrapper },
    );
    expect(result.current.translation.t("greeting", { name: "Ada" })).toBe(
      "Hello, Ada!",
    );
    act(() => result.current.locale.setLocale("fr"));
    expect(result.current.translation.t("greeting", { name: "Ada" })).toBe(
      "Bonjour, Ada !",
    );
  });

  it("returns the key (and RTL) for a locale with no catalog", () => {
    const { result } = renderHook(
      () => ({ translation: useTranslation(), locale: useLocale() }),
      { wrapper },
    );
    act(() => result.current.locale.setLocale("ar"));
    expect(result.current.translation.t("greeting")).toBe("greeting");
    expect(result.current.translation.direction).toBe("rtl");
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useTranslation())).toThrow(
      "I18nProvider is required",
    );
  });
});
