import type { I18nConfig, Locale, Messages } from "@canonical/i18n-core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import useLocale from "../hooks/useLocale.js";
import I18nProvider from "../I18nProvider/Provider.js";
import LocaleSelector from "./LocaleSelector.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = { en: {}, fr: {}, ar: {} };

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <I18nProvider config={config} catalogs={catalogs}>
      {children}
    </I18nProvider>
  );
}

describe("LocaleSelector", () => {
  it("renders one endonym option per locale, each tagged with its own lang", () => {
    render(<LocaleSelector />, { wrapper });

    const select = screen.getByRole("combobox");
    expect(select.getAttribute("aria-label")).toBe("Language");
    expect(select.className).toBe("ds locale-selector");

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "en",
      "fr",
      "ar",
    ]);
    expect(options.map((option) => option.getAttribute("lang"))).toEqual([
      "en",
      "fr",
      "ar",
    ]);
    expect(screen.getByRole("option", { name: "English" })).toBeTruthy();
    expect(options.every((option) => (option.textContent ?? "") !== "")).toBe(
      true,
    );
  });

  it("switches the active locale on change", () => {
    function Probe(): React.ReactElement {
      const { locale } = useLocale();
      return <p>{`current:${locale}`}</p>;
    }

    render(
      <>
        <LocaleSelector />
        <Probe />
      </>,
      { wrapper },
    );

    expect(screen.getByText("current:en")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ar" },
    });
    expect(screen.getByText("current:ar")).toBeTruthy();
  });

  it("prefers provided labels over endonyms and calls a consumer onChange", () => {
    const onChange = vi.fn();
    render(
      <LocaleSelector
        labels={{ en: "Inglés", fr: "Francés", ar: "Árabe" }}
        onChange={onChange}
      />,
      { wrapper },
    );

    expect(screen.getByRole("option", { name: "Inglés" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "fr" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("accepts a translated aria-label and a custom className", () => {
    render(<LocaleSelector aria-label="Idioma" className="my-select" />, {
      wrapper,
    });

    const select = screen.getByRole("combobox");
    expect(select.getAttribute("aria-label")).toBe("Idioma");
    expect(select.className).toBe("ds locale-selector my-select");
  });
});
