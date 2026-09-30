import { describe, expect, it } from "vitest";
import documentAttrs from "./documentAttrs.js";
import type { I18nConfig } from "./types.js";

const config: I18nConfig = {
  locales: ["en", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar"],
};

describe("documentAttrs", () => {
  it("returns lang and dir for a locale", () => {
    expect(documentAttrs(config, "en")).toEqual({ lang: "en", dir: "ltr" });
    expect(documentAttrs(config, "ar")).toEqual({ lang: "ar", dir: "rtl" });
  });
});
