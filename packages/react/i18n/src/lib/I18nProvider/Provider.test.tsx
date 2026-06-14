import {
  createLocaleSource,
  type I18nConfig,
  type Locale,
  type Messages,
} from "@canonical/i18n-core";
import { render, screen } from "@testing-library/react";
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
  const { t } = useTranslation();
  return <p>{t("greeting", { name: "Ada" })}</p>;
}

function ShowLocale(): React.ReactElement {
  const { locale } = useLocale();
  return <span>{locale}</span>;
}

describe("I18nProvider", () => {
  it("renders translated content for the default locale", () => {
    render(
      <I18nProvider config={config} catalogs={catalogs}>
        <Greeting />
      </I18nProvider>,
    );
    expect(screen.getByText("Hello, Ada!")).toBeTruthy();
  });

  it("starts at an explicit initial locale", () => {
    render(
      <I18nProvider config={config} catalogs={catalogs} locale="fr">
        <ShowLocale />
      </I18nProvider>,
    );
    expect(screen.getByText("fr")).toBeTruthy();
  });

  it("binds to an external locale source when provided", () => {
    const source = createLocaleSource(config, {
      initial: "fr",
      persist: false,
      reflect: false,
    });
    render(
      <I18nProvider config={config} catalogs={catalogs} source={source}>
        <ShowLocale />
      </I18nProvider>,
    );
    expect(screen.getByText("fr")).toBeTruthy();
  });
});
