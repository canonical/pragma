import { describe, expect, it } from "vitest";
import { ADDON_ID } from "./constants.js";
import preview from "./preview.js";

describe("preview", () => {
  it("exposes initialGlobals with addon enabled by default", () => {
    expect(preview.initialGlobals).toBeDefined();
    expect(preview.initialGlobals?.[ADDON_ID]).toBe(true);
  });

  it("exposes decorators array", () => {
    expect(preview.decorators).toBeDefined();
    expect(Array.isArray(preview.decorators)).toBe(true);
  });
});
