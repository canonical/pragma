import { describe, expect, it } from "vitest";
import describeSortDirection from "./describeSortDirection.js";

describe("describeSortDirection", () => {
  it("reads each direction as its word", () => {
    expect(describeSortDirection("asc")).toBe("ascending");
    expect(describeSortDirection("desc")).toBe("descending");
  });
});
