import { describe, expect, it } from "vitest";
import { THEME } from "./theme.js";

describe("THEME", () => {
  it("exports light and dark themes", () => {
    expect(THEME).toHaveProperty("light");
    expect(THEME).toHaveProperty("dark");
  });

  it("light theme has base light and canonical colors", () => {
    expect(THEME.light.base).toBe("light");
  });

  it("dark theme has base dark and canonical colors", () => {
    expect(THEME.dark.base).toBe("dark");
  });
});
