import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import useLocale from "../hooks/useLocale.js";
import useTranslation from "../hooks/useTranslation.js";
import I18nProvider from "./Provider.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = {
  en: { greeting: "Hello, {name}!" },
  fr: { greeting: "Bonjour, {name} !" },
};

function Greeting(): React.ReactElement {
  const { t, direction } = useTranslation();
  return <p dir={direction}>{t("greeting", { name: "Ada" })}</p>;
}

function ShowDirection(): React.ReactElement {
  const { direction } = useLocale();
  return <p dir={direction}>content</p>;
}

describe("I18nProvider SSR", () => {
  it("renders translated markup for the negotiated locale without throwing", () => {
    const html = renderToString(
      <I18nProvider config={config} catalogs={catalogs} locale="fr">
        <Greeting />
      </I18nProvider>,
    );
    expect(html).toContain("Bonjour, Ada !");
  });

  it("reflects RTL direction for Arabic", () => {
    const html = renderToString(
      <I18nProvider config={config} catalogs={catalogs} locale="ar">
        <ShowDirection />
      </I18nProvider>,
    );
    expect(html).toContain('dir="rtl"');
  });
});
