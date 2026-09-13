import { describe, expect, it } from "vitest";
import { DISPLAY_STATUS_PHASES } from "./constants.js";

describe("DISPLAY_STATUS_PHASES", () => {
  it("marks every settled outcome terminal and every passing state transient", () => {
    expect(DISPLAY_STATUS_PHASES).toEqual({
      pending: "transient",
      regrouping: "transient",
      failed: "terminal",
      "refresh-failed": "terminal",
      stale: "terminal",
      "no-data": "terminal",
      "no-results": "terminal",
    });
    expect(Object.isFrozen(DISPLAY_STATUS_PHASES)).toBe(true);
  });
});
