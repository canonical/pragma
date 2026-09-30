import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import I18nProvider from "../I18nProvider/Provider.js";
import useLocale from "./useLocale.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = { en: {}, fr: {} };

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <I18nProvider config={config} catalogs={catalogs}>
      {children}
    </I18nProvider>
  );
}

describe("useLocale", () => {
  it("exposes the locale, direction, and configured locales", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("en");
    expect(result.current.direction).toBe("ltr");
    expect(result.current.locales).toEqual(["en", "fr", "ar"]);
  });

  it("changes the locale and direction via setLocale", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocale("ar"));
    expect(result.current.locale).toBe("ar");
    expect(result.current.direction).toBe("rtl");
  });
});
