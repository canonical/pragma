import { describe, expect, it } from "vitest";
import isSupportedLocale from "./isSupportedLocale.js";
import type { I18nConfig } from "./types.js";

const config: I18nConfig = { locales: ["en", "fr", "ar"], defaultLocale: "en" };

describe("isSupportedLocale", () => {
  it("accepts a configured locale", () => {
    expect(isSupportedLocale(config, "fr")).toBe(true);
  });

  it("rejects an unconfigured locale", () => {
    expect(isSupportedLocale(config, "de")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isSupportedLocale(config, null)).toBe(false);
    expect(isSupportedLocale(config, undefined)).toBe(false);
  });
});
