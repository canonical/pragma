import { I18nProvider } from "@canonical/i18n-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { catalogs, i18nConfig } from "#i18n/index.js";
import LocaleSelector from "./LocaleSelector.js";

function renderSelector() {
  return render(
    <I18nProvider config={i18nConfig} catalogs={catalogs}>
      <LocaleSelector />
    </I18nProvider>,
  );
}

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup
  document.cookie = "locale=; max-age=0";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("LocaleSelector component", () => {
  it("lists every configured locale by its endonym, tagged with lang", () => {
    renderSelector();

    const select = screen.getByRole("combobox", { name: "Language" });
    const options = within(select).getAllByRole(
      "option",
    ) as HTMLOptionElement[];

    expect(options.map((option) => option.value)).toEqual([
      ...i18nConfig.locales,
    ]);
    // Endonyms come from Intl.DisplayNames — each language names itself.
    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "français",
      "العربية",
    ]);
    // <option lang> lets assistive technology pronounce each endonym
    // in its own language.
    expect(options.map((option) => option.getAttribute("lang"))).toEqual([
      ...i18nConfig.locales,
    ]);
  });

  it("persists the choice and reflects <html lang dir> on change", () => {
    renderSelector();

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "ar" },
    });

    expect(document.cookie).toContain("locale=ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    // Its own accessible name re-translates too.
    expect(screen.getByRole("combobox", { name: "اللغة" })).toBeInTheDocument();
  });
});
