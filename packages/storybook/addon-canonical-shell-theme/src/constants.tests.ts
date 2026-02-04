import { describe, expect, it } from "vitest";
import { ADDON_ID } from "./constants.js";

describe("constants", () => {
  it("exports ADDON_ID as ds-shell-theme-addon", () => {
    expect(ADDON_ID).toBe("ds-shell-theme-addon");
  });
});
