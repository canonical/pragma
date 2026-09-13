import { describe, expect, it } from "vitest";
import { DEFAULT_WINDOW } from "./constants.js";
import rejectWindow from "./rejectWindow.js";

describe("rejectWindow", () => {
  it("accepts positive integer pages and sizes with a token or no cursor", () => {
    expect(rejectWindow(DEFAULT_WINDOW)).toBe(null);
    expect(rejectWindow({ page: 3, size: 25, cursor: "c:m4" })).toBe(null);
  });

  it("rejects a page that is not a positive integer", () => {
    for (const page of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(rejectWindow({ ...DEFAULT_WINDOW, page })).toBe(
        "page must be a positive integer",
      );
    }
  });

  it("rejects a size that is not a positive integer", () => {
    for (const size of [0, -5, 2.5, Number.NaN]) {
      expect(rejectWindow({ ...DEFAULT_WINDOW, size })).toBe(
        "size must be a positive integer",
      );
    }
  });

  it("rejects an empty cursor, which is neither a token nor its absence", () => {
    expect(rejectWindow({ ...DEFAULT_WINDOW, cursor: "" })).toBe(
      "cursor must not be empty; use null to clear it",
    );
  });
});
