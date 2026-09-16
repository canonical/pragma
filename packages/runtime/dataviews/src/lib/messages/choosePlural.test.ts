import { describe, expect, it } from "vitest";
import choosePlural from "./choosePlural.js";

describe("choosePlural", () => {
  it("takes the singular form for one", () => {
    expect(choosePlural(1, "row", "rows")).toBe("row");
  });

  it("takes the plural form for every other count, zero and fractions included", () => {
    for (const count of [0, 2, 11, 1.5, 1000]) {
      expect(choosePlural(count, "row", "rows")).toBe("rows");
    }
  });
});
