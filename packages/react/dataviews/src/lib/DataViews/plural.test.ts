import { describe, expect, it } from "vitest";
import plural from "./plural.js";

describe("plural", () => {
  it("is singular for one and plural for any other number", () => {
    expect(plural(1, "item")).toBe("item");
    expect(plural(0, "item")).toBe("items");
    expect(plural(2, "page")).toBe("pages");
  });
});
