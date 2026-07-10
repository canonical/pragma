import { I18nProvider } from "@canonical/i18n-react";
import { HeadProvider } from "@canonical/react-head";
import { createHashRouter, route } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { catalogs, i18nConfig } from "#i18n/index.js";
import Navigation from "./Navigation.js";

// jsdom ships no matchMedia; ThemeSelector's usePreferredTheme queries it.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// The route names and URL shapes Navigation links to, with no page content:
// importing the real route map would drag every domain page (and its
// dependencies) into this chrome-only test.
const routes = {
  home: route({ url: "/", content: () => null }),
  guide: route({ url: "/guides/:slug", content: () => null }),
  catalog: route({ url: "/catalog", content: () => null }),
  contact: route({ url: "/contact", content: () => null }),
  account: route({ url: "/account", content: () => null }),
} as const;

/**
 * The app-shell chrome under the real providers: the same I18nProvider both
 * entries mount, and a hash router so `Link` resolves without a server.
 */
function renderShell() {
  const router = createHashRouter(routes);

  return render(
    <I18nProvider config={i18nConfig} catalogs={catalogs}>
      <HeadProvider>
        <RouterProvider router={router}>
          <Navigation />
        </RouterProvider>
      </HeadProvider>
    </I18nProvider>,
  );
}

afterEach(() => {
  // The locale source persists to a cookie and reflects <html lang dir>;
  // reset both so tests stay independent.
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup
  document.cookie = "locale=; max-age=0";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("Navigation component", () => {
  it("renders the English chrome by default", () => {
    renderShell();

    expect(
      screen.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalog" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Color theme" }),
    ).toBeInTheDocument();
  });

  it("switches every visible string when the selector picks French", () => {
    renderShell();

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "fr" },
    });

    // Links, the theme selector, and the locale selector itself re-translate…
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalogue" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Thème de couleur" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Langue" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Home" }),
    ).not.toBeInTheDocument();
    // …and the choice persists for the server's next negotiation.
    expect(document.cookie).toContain("locale=fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("flips the document to right-to-left for Arabic", () => {
    renderShell();

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "ar" },
    });

    expect(screen.getByRole("link", { name: "الرئيسية" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });
});
