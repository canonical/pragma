import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import I18nProvider from "../I18nProvider/Provider.js";
import LocaleSelector from "./LocaleSelector.js";

const config: I18nConfig = { locales: ["en", "fr"], defaultLocale: "en" };
const catalogs: Record<Locale, Messages> = { en: {}, fr: {} };

describe("LocaleSelector SSR", () => {
  it("renders a labelled select with a lang-tagged option per locale", () => {
    const html = renderToString(
      <I18nProvider config={config} catalogs={catalogs}>
        <LocaleSelector />
      </I18nProvider>,
    );

    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('lang="fr"');
    expect(html).toContain("English");
  });
});
