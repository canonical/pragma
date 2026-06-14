import {
  createLocaleSource,
  type I18nConfig,
  type Locale,
  type Messages,
} from "@canonical/i18n-core";
import type { ReactiveControllerHost } from "lit";
import { describe, expect, it } from "vitest";
import LocaleController from "./LocaleController.js";

const config: I18nConfig = {
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

const catalogs: Record<Locale, Messages> = {
  en: { greeting: "Hello, {name}!" },
  fr: { greeting: "Bonjour, {name} !" },
};

function createHost(): { host: ReactiveControllerHost; updates: () => number } {
  let count = 0;
  const host: ReactiveControllerHost = {
    addController() {},
    removeController() {},
    requestUpdate() {
      count += 1;
    },
    get updateComplete() {
      return Promise.resolve(true);
    },
  };
  return { host, updates: () => count };
}

describe("LocaleController", () => {
  it("exposes the locale, translator, and formatters, and updates on change", () => {
    const { host, updates } = createHost();
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const controller = new LocaleController(host, source, catalogs);
    controller.hostConnected();

    expect(controller.locale).toBe("en");
    expect(controller.direction).toBe("ltr");
    expect(controller.t("greeting", { name: "Ada" })).toBe("Hello, Ada!");

    source.set("fr");
    expect(updates()).toBeGreaterThan(0);
    expect(controller.locale).toBe("fr");
    expect(controller.t("greeting", { name: "Ada" })).toBe("Bonjour, Ada !");

    controller.hostDisconnected();
    const seen = updates();
    source.set("ar"); // unsubscribed: no further updates
    expect(updates()).toBe(seen);
  });

  it("switches locale via setLocale, with RTL and memoized formatters", () => {
    const { host } = createHost();
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const controller = new LocaleController(host, source, catalogs);
    controller.hostConnected();

    controller.setLocale("ar");
    expect(controller.locale).toBe("ar");
    expect(controller.direction).toBe("rtl");
    expect(controller.t("greeting")).toBe("greeting"); // ar has no catalog
    expect(controller.formatters).toBe(controller.formatters); // memoized
  });

  it("is safe to disconnect without connecting", () => {
    const { host } = createHost();
    const source = createLocaleSource(config, {
      persist: false,
      reflect: false,
    });
    const controller = new LocaleController(host, source, catalogs);
    expect(() => controller.hostDisconnected()).not.toThrow();
  });
});
