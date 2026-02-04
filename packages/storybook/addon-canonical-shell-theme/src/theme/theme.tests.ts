import { describe, expect, it } from "vitest";
import { THEME } from "./theme.js";

describe("THEME", () => {
  it("exports light and dark themes", () => {
    expect(THEME).toHaveProperty("light");
    expect(THEME).toHaveProperty("dark");
  });

  it("light theme has base light and canonical colors", () => {
    expect(THEME.light.base).toBe("light");
    expect(THEME.light.colorPrimary).toBe("#E95420");
    expect(THEME.light.fontBase).toBe("var(--font-ubuntu-sans)");
    expect(THEME.light.appBg).toBe("#f3f3f3");
  });

  it("dark theme has base dark and canonical colors", () => {
    expect(THEME.dark.base).toBe("dark");
    expect(THEME.dark.colorPrimary).toBe("#E8541F");
    expect(THEME.dark.fontBase).toBe("var(--font-ubuntu-sans)");
    expect(THEME.dark.appBg).toBe("#262626");
  });
});
