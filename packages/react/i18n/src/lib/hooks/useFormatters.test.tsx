import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import I18nProvider from "../I18nProvider/Provider.js";
import useFormatters from "./useFormatters.js";
import useLocale from "./useLocale.js";

const config: I18nConfig = {
  locales: ["en", "fr"],
  defaultLocale: "en",
};

const catalogs: Record<Locale, Messages> = { en: {}, fr: {} };

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <I18nProvider config={config} catalogs={catalogs} locale="en-US">
      {children}
    </I18nProvider>
  );
}

describe("useFormatters", () => {
  it("formats for the active locale", () => {
    const { result } = renderHook(() => useFormatters(), { wrapper });
    expect(result.current.number(1234.5)).toBe("1,234.5");
  });

  it("re-formats when the locale changes", () => {
    const { result } = renderHook(
      () => ({ formatters: useFormatters(), locale: useLocale() }),
      { wrapper },
    );
    const before = result.current.formatters.number(1234.5);
    act(() => result.current.locale.setLocale("fr-FR"));
    expect(result.current.formatters.number(1234.5)).not.toBe(before);
  });
});
