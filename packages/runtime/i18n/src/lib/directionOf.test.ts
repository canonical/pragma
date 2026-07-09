import { describe, expect, it } from "vitest";
import directionOf from "./directionOf.js";
import type { I18nConfig } from "./types.js";

const config: I18nConfig = {
  locales: ["en", "ar"],
  defaultLocale: "en",
  rtlLocales: ["ar", "he"],
};

describe("directionOf", () => {
  it("returns ltr for an undefined locale", () => {
    expect(directionOf(config, undefined)).toBe("ltr");
  });

  it("returns rtl for an rtl base language, ignoring region and case", () => {
    expect(directionOf(config, "ar")).toBe("rtl");
    expect(directionOf(config, "AR-EG")).toBe("rtl");
  });

  it("returns ltr for an ltr locale", () => {
    expect(directionOf(config, "en")).toBe("ltr");
  });

  it("returns ltr when no rtl locales are configured", () => {
    expect(directionOf({ locales: ["ar"], defaultLocale: "ar" }, "ar")).toBe(
      "ltr",
    );
  });
});
